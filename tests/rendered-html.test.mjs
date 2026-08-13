import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    DB: { prepare() { throw new Error("DB should not be queried during shell rendering"); } },
    EVIDENCE: {},
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the ER Permission Report dashboard", async () => {
  const response = await render("/dashboard");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>ER Permission Report<\/title>/i);
  assert.match(html, /Welcome back, Ari/);
  assert.match(html, /Every action/);
  assert.match(html, /New Permission Report/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/i);
});

test("keeps controlled domain vocabulary and exact permission options", async () => {
  const [domain, portal, schema, stage2, migration] = await Promise.all([
    readFile(new URL("../lib/domain.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/portal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/stage2.tsx", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_new_sunspot.sql", import.meta.url), "utf8"),
  ]);
  for (const permission of ["Warn","Jail","Revive","Setjob","Teleport","Bring","Goto","Spectate","SetGang"]) assert.match(domain, new RegExp(`"${permission}"`));
  for (const status of ["Pending","Under Review","Approved","Needs Information","Rejected","Escalated"]) assert.match(domain, new RegExp(`"${status}"`));
  assert.match(domain, /Head Admin.*Staff Manger.*Managment.*Server Management.*Owner/s);
  assert.match(portal, /Permission Reports Without Evidence/);
  assert.match(schema, /idx_permission_reports_status_created/);
  assert.match(schema, /idx_permission_reports_target_discord/);
  assert.match(schema, /permission_usage_logs/);
  assert.match(schema, /permission_log_imports/);
  assert.match(stage2, /Permission Reconciliation/);
  assert.match(stage2, /Target Player Name <span>Optional/);
  assert.match(stage2, />Today </);
  assert.match(stage2, />Now</);
  assert.match(migration, /INSERT INTO `__new_permission_reports`/);
  assert.match(migration, /PRAGMA optimize/);
});
