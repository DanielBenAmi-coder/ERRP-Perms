import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { signPayload } from "../../../../lib/discord";

export async function POST(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { discordId?: unknown; name?: unknown } | null;
  const discordId = String(body?.discordId ?? "").trim();
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");

  if (!/^\d{15,22}$/.test(discordId)) {
    return NextResponse.json({ error: "Enter a valid Discord ID containing digits only." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 64) {
    return NextResponse.json({ error: "Enter your name (2–64 characters)." }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const rank = "Admin" as const;
  await env.DB.prepare(`INSERT INTO users (id, discord_id, username, display_name, avatar_url, staff_rank, created_at, last_login_at, last_sync_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET username=excluded.username, display_name=excluded.display_name,
    staff_rank=excluded.staff_rank, last_login_at=excluded.last_login_at, last_sync_at=excluded.last_sync_at`)
    .bind(discordId, discordId, name, name, rank, now, now, now).run();

  const session = await signPayload({ sub: discordId, username: name, name, rank, exp: Date.now() + 8 * 60 * 60 * 1000 }, secret);
  const jar = await cookies();
  jar.set("er_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}
