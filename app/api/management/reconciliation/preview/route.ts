import { env } from "../../../../../lib/platform-env";
import { NextRequest, NextResponse } from "next/server";
import { detectImportFileType, mapParsedRows, parsePermissionFile, suggestColumnMapping } from "../../../../../lib/permission-log-parser";
import { signPayload } from "../../../../../lib/discord";
import { duplicateKey } from "../../../../../lib/reconciliation";
import { requireHigherStaffManagement } from "../../../../../lib/server-auth";

export async function POST(request:NextRequest){
  const access=await requireHigherStaffManagement(); if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const form=await request.formData(); const file=form.get("file"); if(!(file instanceof File))return NextResponse.json({error:"Choose a CSV, XLSX or JSON permission log."},{status:400});
  const maxMb=Math.max(1,Number(process.env.MAX_PERMISSION_IMPORT_MB)||20); if(file.size>maxMb*1024*1024)return NextResponse.json({error:`File exceeds the ${maxMb} MB import limit.`},{status:413});
  const type=detectImportFileType(file.name,file.type); if(!type)return NextResponse.json({error:"Unsupported file type. Upload CSV, XLSX or JSON."},{status:415});
  try{
    const bytes=await file.arrayBuffer(); const limits={maxRows:Math.max(1,Number(process.env.MAX_PERMISSION_IMPORT_ROWS)||25000),maxSheets:Math.max(1,Number(process.env.MAX_PERMISSION_IMPORT_SHEETS)||3)};
    const parsed=parsePermissionFile(bytes,type,limits); const suggestedMapping=suggestColumnMapping(parsed.columns);
    const previewMapping=suggestedMapping.staffDiscordId&&suggestedMapping.permission&&suggestedMapping.targetPlayerId&&suggestedMapping.actionAt?suggestedMapping as Parameters<typeof mapParsedRows>[1]:null;
    const mapped=previewMapping?mapParsedRows(parsed.rows,previewMapping):[]; const seen=new Set<string>(); let duplicates=0; for(const row of mapped){const key=duplicateKey(row);if(seen.has(key))duplicates++;else seen.add(key);}
    const objectKey=`permission-imports/pending/${crypto.randomUUID()}`; await env.EVIDENCE!.put(objectKey,bytes,{httpMetadata:{contentType:file.type||"application/octet-stream"},customMetadata:{filename:file.name,type}});
    const secret=process.env.AUTH_SECRET!; const token=await signPayload({sub:access.user.id,scope:"reconciliation-preview",objectKey,filename:file.name,fileType:type,fileSize:file.size,exp:Date.now()+20*60_000},secret);
    return NextResponse.json({token,filename:file.name,fileType:type,fileSize:file.size,totalRows:parsed.rows.length,columns:parsed.columns,sheetCount:parsed.sheetCount,suggestedMapping,validRows:mapped.filter(row=>!row.validationError).length,invalidRows:mapped.filter(row=>row.validationError).length,duplicateRows:duplicates,sampleRows:parsed.rows.slice(0,12)});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to parse the permission log."},{status:400});}
}
