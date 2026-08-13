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
  targetPlayerName: text("target_player_name"), targetPlayerId: text("target_player_id").notNull(), targetDiscordId: text("target_discord_id"),
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

export const permissionLogImports = sqliteTable("permission_log_imports", {
  id: text("id").primaryKey(),
  publicId: text("public_id").notNull(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedByUserId: text("uploaded_by_user_id").notNull().references(() => users.id),
  columnMappingJson: text("column_mapping_json").notNull(),
  totalRows: integer("total_rows").notNull(),
  validRows: integer("valid_rows").notNull(),
  invalidRows: integer("invalid_rows").notNull(),
  duplicateRows: integer("duplicate_rows").notNull(),
  matchedRows: integer("matched_rows").notNull(),
  unmatchedRows: integer("unmatched_rows").notNull(),
  reviewRequiredRows: integer("review_required_rows").notNull(),
  status: text("status").notNull().default("Completed"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (t) => [
  uniqueIndex("idx_permission_log_imports_public_id").on(t.publicId),
  index("idx_permission_log_imports_created").on(t.createdAt),
  index("idx_permission_log_imports_uploader").on(t.uploadedByUserId),
]);

export const permissionUsageLogs = sqliteTable("permission_usage_logs", {
  id: text("id").primaryKey(),
  importBatchId: text("import_batch_id").notNull().references(() => permissionLogImports.id),
  sourceRowNumber: integer("source_row_number").notNull(),
  staffDiscordId: text("staff_discord_id"),
  staffUserId: text("staff_user_id").references(() => users.id),
  permissionType: text("permission_type"),
  targetPlayerId: text("target_player_id"),
  targetDiscordId: text("target_discord_id"),
  actionAt: integer("action_at", { mode: "timestamp" }),
  serverName: text("server_name"),
  rawLogId: text("raw_log_id"),
  rawMetadataJson: text("raw_metadata_json").notNull(),
  validationError: text("validation_error"),
  matchStatus: text("match_status").notNull(),
  matchedPermissionReportId: integer("matched_permission_report_id").references(() => permissionReports.id),
  timeDifferenceSeconds: integer("time_difference_seconds"),
  matchExplanationJson: text("match_explanation_json"),
  reviewStatus: text("review_status").notNull().default("Not Reviewed"),
  reviewedByUserId: text("reviewed_by_user_id").references(() => users.id),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  reviewNote: text("review_note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  index("idx_permission_usage_import_status").on(t.importBatchId, t.matchStatus),
  index("idx_permission_usage_staff_action").on(t.staffDiscordId, t.actionAt),
  index("idx_permission_usage_permission_target").on(t.permissionType, t.targetPlayerId),
  index("idx_permission_usage_matched_report").on(t.matchedPermissionReportId),
  index("idx_permission_usage_review_status").on(t.reviewStatus),
  uniqueIndex("idx_permission_usage_import_row").on(t.importBatchId, t.sourceRowNumber),
]);
