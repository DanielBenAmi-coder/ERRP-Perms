import { cookies } from "next/headers";
import { isHigherStaff } from "./domain";
import { verifyPayload } from "./discord";

export async function requireStaffSession() {
  const secret=process.env.AUTH_SECRET;if(!secret)return {ok:false as const,status:503,error:"Authentication is not configured."};
  const jar=await cookies();const session=await verifyPayload(jar.get("er_session")?.value,secret);if(!session)return {ok:false as const,status:401,error:"Discord sign-in required."};
  return {ok:true as const,user:{id:session.sub,discordId:session.sub,rank:session.rank,name:String(session.name??session.username??"Staff")}};
}

export async function requireHigherStaffManagement() {
  const staff=await requireStaffSession();if(!staff.ok)return staff;const secret=process.env.AUTH_SECRET!;
  const jar=await cookies(); const session=await verifyPayload(jar.get("er_session")?.value,secret);
  if(!session||!isHigherStaff(session.rank)) return {ok:false as const,status:403,error:"Higher Staff access required."};
  const management=await verifyPayload(jar.get("er_management")?.value,secret);
  if(!management||management.sub!==session.sub||management.scope!=="ERPermissionReport") return {ok:false as const,status:403,error:"ERPermissionReport management verification required."};
  return {ok:true as const,user:{id:session.sub,rank:session.rank,name:String(session.name??session.username??"Higher Staff")}};
}
