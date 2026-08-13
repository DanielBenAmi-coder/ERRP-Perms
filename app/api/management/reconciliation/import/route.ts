import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { verifyPayload } from "../../../../../lib/discord";
import { mapParsedRows, parsePermissionFile, REQUIRED_MAPPING_FIELDS, type ColumnMapping, type ImportFileType } from "../../../../../lib/permission-log-parser";
import { reconcilePermissionUsage, type PermissionReportCandidate } from "../../../../../lib/reconciliation";
import { requireHigherStaffManagement } from "../../../../../lib/server-auth";

type PreviewToken={sub:string;scope:string;objectKey:string;filename:string;fileType:ImportFileType;fileSize:number;exp:number};
type DbUser={id:string;discord_id:string};
type DbReport={id:number;public_id:string;discord_id:string;permission_type:PermissionReportCandidate["permission"];target_player_id:string;incident_at:number};

async function resolveUsers(discordIds:string[]){const result=new Map<string,string>();for(let i=0;i<discordIds.length;i+=80){const ids=discordIds.slice(i,i+80);if(!ids.length)continue;const rows=await env.DB.prepare(`SELECT id, discord_id FROM users WHERE discord_id IN (${ids.map(()=>"?").join(",")})`).bind(...ids).all<DbUser>();for(const row of rows.results)result.set(row.discord_id,row.id);}return result;}
async function runBatches(statements:D1PreparedStatement[]){for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));}

export async function POST(request:NextRequest){
  const access=await requireHigherStaffManagement();if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const body=await request.json().catch(()=>null) as {token?:string;mapping?:ColumnMapping}|null; if(!body?.token||!body.mapping)return NextResponse.json({error:"Preview token and column mapping are required."},{status:400});
  if(REQUIRED_MAPPING_FIELDS.some(field=>!body.mapping?.[field]))return NextResponse.json({error:"Map Staff Discord ID, Permission, Target Player ID and Action Date / Time."},{status:400});
  const secret=process.env.AUTH_SECRET!;const token=await verifyPayload(body.token,secret) as PreviewToken|null;if(!token||token.sub!==access.user.id||token.scope!=="reconciliation-preview")return NextResponse.json({error:"The import preview expired. Upload the file again."},{status:400});
  const object=await env.EVIDENCE!.get(token.objectKey);if(!object)return NextResponse.json({error:"The temporary import file is no longer available."},{status:410});
  try{
    const parsed=parsePermissionFile(await object.arrayBuffer(),token.fileType,{maxRows:Math.max(1,Number(process.env.MAX_PERMISSION_IMPORT_ROWS)||25000),maxSheets:Math.max(1,Number(process.env.MAX_PERMISSION_IMPORT_SHEETS)||3)});
    const usages=mapParsedRows(parsed.rows,body.mapping);const valid=usages.filter(row=>!row.validationError&&row.actionAt);const discordIds=[...new Set(valid.flatMap(row=>row.staffDiscordId?[row.staffDiscordId]:[]))];const users=await resolveUsers(discordIds);
    const windowMinutes=Math.max(1,Number(process.env.PERMISSION_MATCH_WINDOW_MINUTES)||10);const graceMinutes=Math.max(0,Number(process.env.PERMISSION_REPORT_GRACE_MINUTES)||15);
    const times=valid.flatMap(row=>row.actionAt?[row.actionAt.getTime()]:[]);const minTime=Math.floor((Math.min(...times)-windowMinutes*60_000)/1000);const maxTime=Math.ceil((Math.max(...times)+windowMinutes*60_000)/1000);
    const reportRows=times.length?(await env.DB.prepare(`SELECT pr.id, pr.public_id, u.discord_id, pr.permission_type, pr.target_player_id, COALESCE(pr.incident_at, pr.created_at) AS incident_at FROM permission_reports pr JOIN users u ON u.id=pr.created_by_user_id WHERE COALESCE(pr.incident_at, pr.created_at) BETWEEN ? AND ? AND pr.archived_at IS NULL`).bind(minTime,maxTime).all<DbReport>()).results:[];
    const candidates:PermissionReportCandidate[]=reportRows.map(row=>({id:row.id,publicId:row.public_id,staffDiscordId:row.discord_id,permission:row.permission_type,targetPlayerId:row.target_player_id,incidentAt:new Date(row.incident_at*1000)}));
    const results=reconcilePermissionUsage(usages,candidates,{matchWindowMinutes:windowMinutes,graceMinutes});const batchId=crypto.randomUUID();const publicId=`ER-IMPORT-${String(Date.now()).slice(-6)}`;const now=Math.floor(Date.now()/1000);
    const counts={valid:results.filter(row=>!["INVALID","DUPLICATE"].includes(row.status)).length,invalid:results.filter(row=>row.status==="INVALID").length,duplicates:results.filter(row=>row.status==="DUPLICATE").length,matched:results.filter(row=>["MATCHED","LIKELY_MATCH"].includes(row.status)).length,unmatched:results.filter(row=>["AWAITING_REPORT","UNREPORTED"].includes(row.status)).length,review:results.filter(row=>["UNREPORTED","AMBIGUOUS","LIKELY_MATCH"].includes(row.status)).length};
    await env.DB.prepare(`INSERT INTO permission_log_imports (id,public_id,filename,file_type,file_size,uploaded_by_user_id,column_mapping_json,total_rows,valid_rows,invalid_rows,duplicate_rows,matched_rows,unmatched_rows,review_required_rows,status,created_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(batchId,publicId,token.filename,token.fileType,token.fileSize,access.user.id,JSON.stringify(body.mapping),results.length,counts.valid,counts.invalid,counts.duplicates,counts.matched,counts.unmatched,counts.review,"Completed",now,now).run();
    const statements=results.map((result)=>env.DB.prepare(`INSERT INTO permission_usage_logs (id,import_batch_id,source_row_number,staff_discord_id,staff_user_id,permission_type,target_player_id,target_discord_id,action_at,raw_log_id,raw_metadata_json,validation_error,match_status,matched_permission_report_id,time_difference_seconds,match_explanation_json,review_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(result.id,batchId,result.sourceRowNumber,result.staffDiscordId,result.staffDiscordId?users.get(result.staffDiscordId)??null:null,result.permission,result.targetPlayerId,result.targetDiscordId??null,result.actionAt?Math.floor(result.actionAt.getTime()/1000):null,result.rawLogId??null,JSON.stringify(parsed.rows[result.sourceRowNumber-2]??{}),result.validationError??null,result.status,result.matchedReportId,result.timeDifferenceSeconds,JSON.stringify(result.explanation),"Not Reviewed",now));
    statements.push(env.DB.prepare(`INSERT INTO audit_logs (id,actor_user_id,action,new_value,created_at) VALUES (?,?,?,?,?)`).bind(crypto.randomUUID(),access.user.id,"PERMISSION_LOG_IMPORTED",JSON.stringify({importId:publicId,filename:token.filename,totalRows:results.length,matched:counts.matched,unreported:results.filter(row=>row.status==="UNREPORTED").length}),now));await runBatches(statements);await env.EVIDENCE!.delete(token.objectKey);
    return NextResponse.json({ok:true,id:batchId,publicId,counts:{total:results.length,...counts}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to complete the import."},{status:400});}
}
