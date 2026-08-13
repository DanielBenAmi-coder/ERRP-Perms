# ER Permission Report

Internal permission-reporting and Higher Staff review system for ER Roleplay.

## Included

- Discord OAuth2 with guild membership and exact role hierarchy resolution.
- D1 schema for staff, Permission Reports, private evidence metadata, notifications and audit logs.
- R2 binding for private evidence objects.
- Server-side Higher Staff management verification using an HMAC session and PBKDF2 password hash.
- Personal dashboards, Permission Report creation/history/details, No Evidence and review queues, Staff profiles, analytics, audit logs and settings.
- Responsive desktop, tablet and mobile layouts based on the official ER Roleplay logo.

## Configuration

Copy `.env.example` to `.env.local` for local development and set the matching secrets in the hosting environment. The management hash format is `iterations:saltHex:derivedKeyHex` using PBKDF2-SHA256. Never commit real credentials.

Run `pnpm dev` locally. Use `pnpm test`, `pnpm run lint`, and `pnpm exec tsc --noEmit` to validate changes.
