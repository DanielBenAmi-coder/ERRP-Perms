import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "../../../../lib/platform-env";
import { signPayload } from "../../../../lib/discord";
import { verifyManagementPassword } from "../../../../lib/management";

export async function POST(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { discordId?: unknown; name?: unknown; managementCode?: unknown } | null;
  const discordId = String(body?.discordId ?? "").trim();
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
  const managementCode = String(body?.managementCode ?? "");

  if (!/^\d{15,22}$/.test(discordId)) {
    return NextResponse.json({ error: "Enter a valid Discord ID containing digits only." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 64) {
    return NextResponse.json({ error: "Enter your name (2–64 characters)." }, { status: 400 });
  }

  const localDemo = process.env.LOCAL_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
  const managementHash = process.env.MANAGEMENT_PASSWORD_HASH;
  const isManagement = localDemo
    ? managementCode === "ERPermissionReport"
    : Boolean(managementCode && managementHash && await verifyManagementPassword(managementCode, managementHash));
  if (managementCode && !isManagement) {
    return NextResponse.json({ error: "Higher Staff code is incorrect." }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const rank = isManagement ? "Owner" as const : "Admin" as const;
  try {
    if (localDemo) throw new Error("LOCAL_DEMO_SKIP_DATABASE");
    await env.DB.prepare(`INSERT INTO users (id, discord_id, username, display_name, avatar_url, staff_rank, created_at, last_login_at, last_sync_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET username=excluded.username, display_name=excluded.display_name,
      staff_rank=excluded.staff_rank, last_login_at=excluded.last_login_at, last_sync_at=excluded.last_sync_at`)
      .bind(discordId, discordId, name, name, rank, now, now, now).run();
  } catch (error) {
    if (localDemo && error instanceof Error && error.message === "LOCAL_DEMO_SKIP_DATABASE") {
      // Local preview deliberately uses an in-memory-style session and does not persist staff data.
    } else {
    console.error("Manual sign-in database error", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: process.env.DATABASE_URL ? "The database is unavailable. Please try again shortly." : "The Supabase database is not configured yet." },
      { status: 503 },
    );
    }
  }

  const session = await signPayload({ sub: discordId, username: name, name, rank, exp: Date.now() + 8 * 60 * 60 * 1000 }, secret);
  const jar = await cookies();
  jar.set("er_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  if (isManagement) {
    const minutes = Math.min(120, Math.max(5, Number(process.env.MANAGEMENT_SESSION_MINUTES) || 60));
    const management = await signPayload({ sub: discordId, scope: "ERPermissionReport", exp: Date.now() + minutes * 60_000 }, secret);
    jar.set("er_management", management, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: minutes * 60,
      path: "/",
    });
  }
  return NextResponse.json({ ok: true, rank, redirectTo: isManagement ? "/management" : "/dashboard" });
}
