import type { StaffRank } from "./domain";
import { getStaffRankFromDiscordRoles } from "./domain";

export const DISCORD_API = "https://discord.com/api/v10";
export const DISCORD_AUTHORIZE = "https://discord.com/oauth2/authorize";

export function roleMappingFromEnv(): Partial<Record<StaffRank, string>> {
  return {
    Admin: process.env.DISCORD_ROLE_ADMIN,
    "Senior Admin": process.env.DISCORD_ROLE_SENIOR_ADMIN,
    "Head Admin": process.env.DISCORD_ROLE_HEAD_ADMIN,
    "Staff Manger": process.env.DISCORD_ROLE_STAFF_MANGER,
    Managment: process.env.DISCORD_ROLE_MANAGMENT,
    "Server Management": process.env.DISCORD_ROLE_SERVER_MANAGEMENT,
    Owner: process.env.DISCORD_ROLE_OWNER,
  };
}

export function resolveDiscordRank(roleIds: readonly string[]) {
  return getStaffRankFromDiscordRoles(roleIds, roleMappingFromEnv());
}

export async function signPayload(payload: Record<string, unknown>, secret: string) {
  const body = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${body}.${encoded}`;
}

export async function verifyPayload(token: string | undefined, secret: string) {
  if (!token) return null;
  const [body, encoded] = token.split("."); if (!body || !encoded) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(body));
  if (!valid) return null;
  const payload = JSON.parse(atob(body)) as { sub:string; rank:StaffRank; exp:number; [key:string]:unknown };
  return payload.exp > Date.now() ? payload : null;
}
