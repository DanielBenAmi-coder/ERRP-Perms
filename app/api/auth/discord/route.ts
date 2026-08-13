import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DISCORD_AUTHORIZE } from "../../../../lib/discord";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const appUrl = process.env.APP_URL;
  if (!clientId || !appUrl) return NextResponse.json({ error: "Discord OAuth is not configured." }, { status: 503 });
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("er_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  const query = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: `${appUrl}/api/auth/discord/callback`, scope: "identify guilds.members.read", state });
  return NextResponse.redirect(`${DISCORD_AUTHORIZE}?${query}`);
}
