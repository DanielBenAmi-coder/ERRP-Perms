import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), discordId: text("discord_id").notNull(), username: text("username").notNull(),
  displayName: text("display_name").notNull(), avatarUrl: text("avatar_url"), staffRank: text("staff_rank").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(), lastLoginAt: integer("last_login_at", { mode: "timestamp" }).notNull(),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("idx_users_discord_id").on(t.discordId)]);

export const permissionReports = sqliteTable("permission_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }), publicId: text("public_id").notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id), permissionType: text("permission_type").notNull(),
  targetPlayerName: text("target_player_name").notNull(), targetPlayerId: text("target_player_id").notNull(), targetDiscordId: text("target_discord_id"),
  reason: text("reason").notNull(), incidentAt: integer("incident_at", { mode: "timestamp" }), status: text("status").notNull().default("Pending"),
  noEvidence: integer("no_evidence", { mode: "boolean" }).notNull().default(false), priority: text("priority").notNull().default("Normal"),
  reviewerUserId: text("reviewer_user_id").references(() => users.id), reviewStartedAt: integer("review_started_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(), updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
}, (t) => [
  uniqueIndex("idx_permission_reports_public_id").on(t.publicId), index("idx_permission_reports_owner_created").on(t.createdByUserId, t.createdAt),
  index("idx_permission_reports_status_created").on(t.status, t.createdAt), index("idx_permission_reports_permission").on(t.permissionType),
  index("idx_permission_reports_target_player").on(t.targetPlayerId), index("idx_permission_reports_target_discord").on(t.targetDiscordId),
  index("idx_permission_reports_reviewer").on(t.reviewerUserId),
]);

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(), reportId: integer("report_id").notNull().references(() => permissionReports.id), kind: text("kind").notNull(),
  objectKey: text("object_key"), externalUrl: text("external_url"), fileName: text("file_name"), mimeType: text("mime_type"), sizeBytes: integer("size_bytes"),
  uploadedByUserId: text("uploaded_by_user_id").notNull().references(() => users.id), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [index("idx_evidence_report_id").on(t.reportId)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), reportId: integer("report_id").references(() => permissionReports.id), actorUserId: text("actor_user_id").references(() => users.id),
  action: text("action").notNull(), oldValue: text("old_value"), newValue: text("new_value"), ipHash: text("ip_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [index("idx_audit_logs_report_created").on(t.reportId, t.createdAt), index("idx_audit_logs_actor_created").on(t.actorUserId, t.createdAt)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), reportId: integer("report_id").references(() => permissionReports.id),
  type: text("type").notNull(), message: text("message").notNull(), readAt: integer("read_at", { mode: "timestamp" }), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [index("idx_notifications_user_read").on(t.userId, t.readAt)]);
