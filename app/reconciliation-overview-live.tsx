"use client";

import { useEffect, useMemo, useState } from "react";

type Stats = Record<"total"|"matched"|"likely"|"unreported"|"awaiting"|"ambiguous"|"invalid"|"duplicates", string | number | null>;
type UsageRow = { id:string;match_status:string;staff_discord_id:string|null;staff_name:string;staff_rank:string;permission_type:string|null;target_player_id:string|null;action_at:number|null;matched_report:string|null;time_difference_seconds:number|null;review_status:string;import_public_id:string };
type ImportRow = { id:string;public_id:string;filename:string;total_rows:number;matched_rows:number;unmatched_rows:number;invalid_rows:number;duplicate_rows:number;status:string;created_at:number;uploaded_by:string|null };
type CoverageRow = { staff_name:string;staff_rank:string;staff_discord_id:string;detected:string|number;matched:string|number;unreported:string|number };
type Payload = { stats:Stats;usages:UsageRow[];imports:ImportRow[];coverage:CoverageRow[];error?:string };

const emptyStats: Stats = { total:0,matched:0,likely:0,unreported:0,awaiting:0,ambiguous:0,invalid:0,duplicates:0 };
const number = (value:string|number|null|undefined) => Number(value || 0);
const Badge = ({value}:{value:string}) => <span className={`badge badge-${value.toLowerCase().replaceAll("_","-")}`}>{value.replaceAll("_"," ")}</span>;
const when = (seconds:number|null) => seconds ? new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jerusalem"}).format(new Date(seconds*1000)) : "—";
const difference = (seconds:number|null) => seconds == null ? "—" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds/60)}m ${seconds%60}s`;

export function ReconciliationOverviewLive({detail,onUpload}:{detail:boolean;onUpload:()=>void}) {
  const [data,setData]=useState<Payload>({stats:emptyStats,usages:[],imports:[],coverage:[]});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{let active=true;fetch("/api/management/reconciliation").then(async response=>{const result=await response.json() as Payload;if(!response.ok)throw new Error(result.error||"Unable to load reconciliation data.");if(active)setData(result)}).catch(reason=>active&&setError(reason instanceof Error?reason.message:"Unable to load reconciliation data.")).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);

  const valid=number(data.stats.total)-number(data.stats.invalid)-number(data.stats.duplicates);
  const reported=number(data.stats.matched)+number(data.stats.likely);
  const rate=valid ? `${(reported/valid*100).toFixed(1)}%` : "0%";
  const rows=detail?data.usages:data.usages.slice(0,8);
  const cards=useMemo(()=>[
    ["Permission Uses",valid,"Valid imported actions","blue"],
    ["Matched",number(data.stats.matched),`${rate} coverage`,"green"],
    ["Likely Matches",number(data.stats.likely),"Review recommended","blue"],
    ["Unreported",number(data.stats.unreported),"Requires investigation","red"],
    ["Awaiting Reports",number(data.stats.awaiting),"Inside grace period","amber"],
    ["Invalid / Duplicate",number(data.stats.invalid)+number(data.stats.duplicates),"Excluded from coverage","orange"],
  ],[data.stats,rate,valid]);

  return <div className="page">
    <div className="page-head"><div><p>HIGHER STAFF · ERPERMISSIONREPORT</p><h1>{detail?"Reconciliation Results":"Permission Reconciliation"}</h1><span>Shared Supabase data from actual permission-log imports and Permission Reports.</span></div><button className="primary" onClick={onUpload}>⇧ Upload Permission Log</button></div>
    {error&&<div className="toast error">! {error}</div>}
    <div className="metrics recon-metrics">{cards.map(([label,value,change,tone])=><div className="metric" key={String(label)}><div><span>{label}</span><i className={String(tone)}>↗</i></div><strong>{loading?"…":value}</strong><small>{change}</small></div>)}</div>
    {!loading&&number(data.stats.unreported)>0&&<div className="recon-alert"><i>!</i><div><b>{number(data.stats.unreported)} unreported permission uses require Higher Staff review</b><p>These are management signals, not automatic disciplinary findings.</p></div></div>}
    <section className="panel"><div className="section-title"><div><span>Reconciliation activity</span><small>One Permission Report can satisfy only one permission usage</small></div></div><div className="table-wrap reconciliation-table"><table><thead><tr><th>Status</th><th>Staff Member</th><th>Permission</th><th>Target ID</th><th>Permission Time</th><th>Matching Report</th><th>Difference</th><th>Review</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><Badge value={row.match_status}/></td><td><b>{row.staff_name}</b><small className="cell-sub">{row.staff_rank} · {row.staff_discord_id||"Unknown ID"}</small></td><td><span className="permission">{row.permission_type||"—"}</span></td><td>ID {row.target_player_id||"—"}</td><td>{when(row.action_at)}</td><td>{row.matched_report?<a href={`/permission-reports/${row.matched_report}`}>{row.matched_report}</a>:"No match"}</td><td>{difference(row.time_difference_seconds)}</td><td><a className="row-review" href={`/management/reconciliation/usage/${row.id}`}>Review →</a></td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={8}>No permission logs imported yet.</td></tr>}</tbody></table></div></section>
    {!detail&&<div className="recon-two"><section className="panel"><div className="section-title"><div><span>Reporting coverage by staff</span><small>Information for human review only</small></div></div>{data.coverage.map(row=>{const detected=number(row.detected),matched=number(row.matched);return <div className="coverage-row" key={row.staff_discord_id}><span className="avatar">{row.staff_name.split(" ").map(part=>part[0]).join("").slice(0,2)}</span><div><b>{row.staff_name}</b><small>{row.staff_rank}</small></div><span>{detected} uses</span><span>{matched} reported</span><strong>{detected?(matched/detected*100).toFixed(1):"0.0"}%</strong></div>})}{!loading&&!data.coverage.length&&<p>No staff coverage data yet.</p>}</section><section className="panel"><div className="section-title"><div><span>Import History</span><small>Previous reconciliation batches</small></div></div>{data.imports.map(row=><div className="coverage-row" key={row.id}><div><a href={`/management/reconciliation/imports/${row.id}`}><b>{row.public_id}</b></a><small>{row.filename} · {when(row.created_at)}</small></div><span>{row.total_rows} rows</span><span>{row.matched_rows} matched</span><strong>{row.unmatched_rows} open</strong></div>)}{!loading&&!data.imports.length&&<p>No imports yet. Upload the first CSV or XLSX log.</p>}</section></div>}
  </div>;
}
