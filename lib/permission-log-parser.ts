import * as XLSX from "xlsx";
import { normalizeIdentifier, normalizePermission, sanitizeImportedValue, type PermissionUsageInput } from "./reconciliation";

export type ImportFileType = "csv" | "xlsx" | "json";
export type ParsedRow = Record<string, string>;
export interface ParsedPermissionFile { columns:string[]; rows:ParsedRow[]; sheetCount:number; }
export interface ColumnMapping { staffDiscordId:string; permission:string; targetPlayerId:string; actionAt:string; staffName?:string; targetDiscordId?:string; serverName?:string; rawLogId?:string; }

export const REQUIRED_MAPPING_FIELDS = ["staffDiscordId","permission","targetPlayerId","actionAt"] as const;
const aliases: Record<(typeof REQUIRED_MAPPING_FIELDS)[number], string[]> = {
  staffDiscordId:["discord","discordid","discord_id","staffdiscordid","staff_discord_id"], permission:["permission","action","command","permissiontype"],
  targetPlayerId:["playerid","player_id","targetid","target_id","targetplayerid"], actionAt:["timestamp","time","datetime","date","actionat","action_at"],
};

export function detectImportFileType(filename:string, mime:string): ImportFileType | null {
  const extension=filename.toLowerCase().split(".").pop();
  if (extension==="csv" && ["text/csv","application/csv","application/vnd.ms-excel",""].includes(mime)) return "csv";
  if (extension==="xlsx" && ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/octet-stream",""].includes(mime)) return "xlsx";
  if (extension==="json" && ["application/json","text/json",""].includes(mime)) return "json";
  return null;
}

function rowFromValues(columns:string[], values:unknown[]) { return Object.fromEntries(columns.map((column,index)=>[column,sanitizeImportedValue(values[index])])); }
function uniqueColumns(values:unknown[]) { const seen=new Map<string,number>(); return values.map((value,index)=>{ const base=sanitizeImportedValue(value)||`Column ${index+1}`; const count=seen.get(base)??0; seen.set(base,count+1); return count===0?base:`${base} (${count+1})`; }); }

export function parseCsv(text:string, maxRows=25000): ParsedPermissionFile {
  const lines:string[][]=[]; let row:string[]=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){ const char=text[i]; if(quoted){ if(char==='"'&&text[i+1]==='"'){field+='"';i++;} else if(char==='"') quoted=false; else field+=char; } else if(char==='"') quoted=true; else if(char===','){row.push(field);field="";} else if(char==='\n'){row.push(field);lines.push(row);row=[];field="";if(lines.length>maxRows+1)throw new Error(`Import exceeds the ${maxRows.toLocaleString()} row limit.`);} else if(char!=='\r') field+=char; }
  if(quoted) throw new Error("CSV contains an unterminated quoted field.");
  if(field.length||row.length){row.push(field);lines.push(row);} if(lines.length<2) throw new Error("The file must contain a header row and at least one data row.");
  const columns=uniqueColumns(lines[0]); return {columns,rows:lines.slice(1).filter(values=>values.some(value=>value.trim())).map(values=>rowFromValues(columns,values)),sheetCount:1};
}

export function parsePermissionFile(bytes:ArrayBuffer, type:ImportFileType, limits:{maxRows:number;maxSheets:number}): ParsedPermissionFile {
  if(type==="csv") return parseCsv(new TextDecoder("utf-8",{fatal:true}).decode(bytes),limits.maxRows);
  if(type==="json") { const value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as unknown; if(!Array.isArray(value)||value.length===0)throw new Error("JSON must contain a non-empty array of row objects."); if(value.length>limits.maxRows)throw new Error(`Import exceeds the ${limits.maxRows.toLocaleString()} row limit.`); const objects=value.filter((row):row is Record<string,unknown>=>Boolean(row)&&typeof row==="object"&&!Array.isArray(row)); const columns=uniqueColumns([...new Set(objects.flatMap(Object.keys))]); return {columns,rows:objects.map(object=>Object.fromEntries(columns.map(column=>[column,sanitizeImportedValue(object[column])]))),sheetCount:1}; }
  const workbook=XLSX.read(bytes,{type:"array",sheetRows:limits.maxRows+2,cellFormula:false,cellHTML:false,cellNF:false});
  if(workbook.SheetNames.length===0)throw new Error("The workbook contains no worksheets."); if(workbook.SheetNames.length>limits.maxSheets)throw new Error(`Workbook exceeds the ${limits.maxSheets} sheet limit.`);
  const values=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]],{header:1,raw:false,defval:""}); if(values.length<2)throw new Error("The workbook must contain a header row and at least one data row."); if(values.length-1>limits.maxRows)throw new Error(`Import exceeds the ${limits.maxRows.toLocaleString()} row limit.`);
  const columns=uniqueColumns(values[0]); return {columns,rows:values.slice(1).filter(row=>row.some(value=>String(value).trim())).map(row=>rowFromValues(columns,row)),sheetCount:workbook.SheetNames.length};
}

export function suggestColumnMapping(columns:string[]): Partial<ColumnMapping> { const normalized=columns.map(column=>column.toLowerCase().replace(/[^a-z0-9_]/g,"")); return Object.fromEntries(Object.entries(aliases).flatMap(([field,names])=>{const index=normalized.findIndex(column=>names.includes(column));return index>=0?[[field,columns[index]]]:[];})); }

export function mapParsedRows(rows:ParsedRow[], mapping:ColumnMapping): PermissionUsageInput[] {
  return rows.map((row,index)=>{ const staffDiscordId=normalizeIdentifier(row[mapping.staffDiscordId]); const permission=normalizePermission(row[mapping.permission]); const targetPlayerId=normalizeIdentifier(row[mapping.targetPlayerId]); const rawDate=row[mapping.actionAt]; const actionAt=rawDate?new Date(rawDate):null; const errors=[]; if(!staffDiscordId)errors.push("Missing Staff Discord ID"); if(!permission)errors.push("Invalid or unsupported permission"); if(!targetPlayerId)errors.push("Missing Target Player ID"); if(!actionAt||Number.isNaN(actionAt.getTime()))errors.push("Invalid Action Date / Time"); return {id:crypto.randomUUID(),sourceRowNumber:index+2,staffDiscordId,permission,targetPlayerId,targetDiscordId:mapping.targetDiscordId?normalizeIdentifier(row[mapping.targetDiscordId]):null,actionAt:actionAt&&!Number.isNaN(actionAt.getTime())?actionAt:null,rawLogId:mapping.rawLogId?normalizeIdentifier(row[mapping.rawLogId]):null,validationError:errors.length?errors.join("; "):null}; });
}
