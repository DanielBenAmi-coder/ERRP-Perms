import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isHigherStaff } from "../../../../lib/domain";
import { signPayload, verifyPayload } from "../../../../lib/discord";
import { verifyManagementPassword } from "../../../../lib/management";

export async function POST(request: NextRequest) {
  const secret=process.env.AUTH_SECRET, hash=process.env.MANAGEMENT_PASSWORD_HASH;
  if (!secret || !hash) return NextResponse.json({error:"Management verification is not configured."},{status:503});
  const jar=await cookies(); const session=await verifyPayload(jar.get("er_session")?.value,secret);
  if (!session || !isHigherStaff(session.rank)) return NextResponse.json({error:"Higher Staff access required."},{status:403});
  const body=await request.json().catch(()=>null) as {password?:string}|null;
  if (!body?.password || !(await verifyManagementPassword(body.password,hash))) return NextResponse.json({error:"Invalid management password."},{status:401});
  const minutes=Math.min(120,Math.max(5,Number(process.env.MANAGEMENT_SESSION_MINUTES)||60));
  const token=await signPayload({sub:session.sub,scope:"ERPermissionReport",exp:Date.now()+minutes*60_000},secret);
  jar.set("er_management",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:minutes*60,path:"/"});
  return NextResponse.json({ok:true,expiresInMinutes:minutes});
}
