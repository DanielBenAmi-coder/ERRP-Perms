import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { DISCORD_API, resolveDiscordRank, signPayload } from "../../../../../lib/discord";

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); const jar = await cookies();
  if (!code || !state || state !== jar.get("er_oauth_state")?.value) return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  const clientId = process.env.DISCORD_CLIENT_ID, clientSecret = process.env.DISCORD_CLIENT_SECRET, appUrl = process.env.APP_URL;
  const guildId = process.env.DISCORD_GUILD_ID, authSecret = process.env.AUTH_SECRET;
  if (!clientId || !clientSecret || !appUrl || !guildId || !authSecret) return NextResponse.redirect(new URL("/login?error=not_configured", request.url));
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, { method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"}, body:new URLSearchParams({ client_id:clientId, client_secret:clientSecret, grant_type:"authorization_code", code, redirect_uri:`${appUrl}/api/auth/discord/callback` }) });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  const token = await tokenRes.json() as { access_token:string };
  const headers = { authorization:`Bearer ${token.access_token}` };
  const [userRes,memberRes] = await Promise.all([fetch(`${DISCORD_API}/users/@me`,{headers}),fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`,{headers})]);
  if (!userRes.ok || !memberRes.ok) return NextResponse.redirect(new URL("/login?error=access_denied", request.url));
  const user = await userRes.json() as { id:string; username:string; global_name?:string; avatar?:string };
  const member = await memberRes.json() as { roles:string[]; nick?:string };
  const rank = resolveDiscordRank(member.roles); if (!rank) return NextResponse.redirect(new URL("/login?error=access_denied", request.url));
  const now = Math.floor(Date.now()/1000);
  await env.DB.prepare(`INSERT INTO users (id, discord_id, username, display_name, avatar_url, staff_rank, created_at, last_login_at, last_sync_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET username=excluded.username, display_name=excluded.display_name, avatar_url=excluded.avatar_url,
    staff_rank=excluded.staff_rank, last_login_at=excluded.last_login_at, last_sync_at=excluded.last_sync_at`)
    .bind(user.id,user.id,user.username,member.nick||user.global_name||user.username,user.avatar?`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`:null,rank,now,now,now).run();
  const session = await signPayload({ sub:user.id, username:user.username, name:member.nick||user.global_name||user.username, rank, exp:Date.now()+8*60*60*1000 }, authSecret);
  jar.delete("er_oauth_state"); jar.set("er_session",session,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:8*60*60,path:"/"});
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
