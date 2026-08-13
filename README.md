# ERRP Perms

ER Roleplay Permission Report and Higher Staff reconciliation system.

## What is included

- Manual staff login using Discord ID and display name.
- Separate private Higher Staff code.
- Shared Supabase database, so reports are visible from every device.
- Permission Reports with optional player name, evidence files or clip URL.
- CSV, XLSX and JSON permission-log import.
- Exact, likely, ambiguous, awaiting-report, unreported, duplicate and exception statuses.
- One-to-one matching by Discord ID, permission, target ID and time window.
- Audit records for report creation, imports and management decisions.
- No Discord webhook is enabled.

## Deployment

1. Create a free Supabase project.
2. Open **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it once.
3. Create a Vercel project from this GitHub repository.
4. Copy every variable from `.env.example` into Vercel **Settings → Environment Variables**.
5. Use the Supabase **Transaction pooler** connection string for `DATABASE_URL`.
6. Generate `AUTH_SECRET` and `MANAGEMENT_PASSWORD_HASH` locally:

   ```powershell
   pnpm run generate:secrets
   ```

7. Redeploy in Vercel. The first login without a Higher Staff code creates an Admin session. Entering the correct code creates an Owner/Higher Staff session.

Never commit the database password, service-role key, management code, or `.env.local`.

## Local demo without hosting

Double-click `RUN-LOCAL-DEMO.bat`. It opens a disposable local preview at
`http://localhost:3000`. Leave the Higher Staff field empty for a normal Admin,
or enter `ERPermissionReport` to preview Higher Staff screens. Demo submissions
are not permanently stored.

## Local verification

```powershell
pnpm install
pnpm test
pnpm build
```
