CREATE TABLE `permission_log_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`column_mapping_json` text NOT NULL,
	`total_rows` integer NOT NULL,
	`valid_rows` integer NOT NULL,
	`invalid_rows` integer NOT NULL,
	`duplicate_rows` integer NOT NULL,
	`matched_rows` integer NOT NULL,
	`unmatched_rows` integer NOT NULL,
	`review_required_rows` integer NOT NULL,
	`status` text DEFAULT 'Completed' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_permission_log_imports_public_id` ON `permission_log_imports` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_log_imports_created` ON `permission_log_imports` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_permission_log_imports_uploader` ON `permission_log_imports` (`uploaded_by_user_id`);--> statement-breakpoint
CREATE TABLE `permission_usage_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`import_batch_id` text NOT NULL,
	`source_row_number` integer NOT NULL,
	`staff_discord_id` text,
	`staff_user_id` text,
	`permission_type` text,
	`target_player_id` text,
	`target_discord_id` text,
	`action_at` integer,
	`server_name` text,
	`raw_log_id` text,
	`raw_metadata_json` text NOT NULL,
	`validation_error` text,
	`match_status` text NOT NULL,
	`matched_permission_report_id` integer,
	`time_difference_seconds` integer,
	`match_explanation_json` text,
	`review_status` text DEFAULT 'Not Reviewed' NOT NULL,
	`reviewed_by_user_id` text,
	`reviewed_at` integer,
	`review_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`import_batch_id`) REFERENCES `permission_log_imports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_permission_report_id`) REFERENCES `permission_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_permission_usage_import_status` ON `permission_usage_logs` (`import_batch_id`,`match_status`);--> statement-breakpoint
CREATE INDEX `idx_permission_usage_staff_action` ON `permission_usage_logs` (`staff_discord_id`,`action_at`);--> statement-breakpoint
CREATE INDEX `idx_permission_usage_permission_target` ON `permission_usage_logs` (`permission_type`,`target_player_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_usage_matched_report` ON `permission_usage_logs` (`matched_permission_report_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_usage_review_status` ON `permission_usage_logs` (`review_status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_permission_usage_import_row` ON `permission_usage_logs` (`import_batch_id`,`source_row_number`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_permission_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`permission_type` text NOT NULL,
	`target_player_name` text,
	`target_player_id` text NOT NULL,
	`target_discord_id` text,
	`reason` text NOT NULL,
	`incident_at` integer,
	`status` text DEFAULT 'Pending' NOT NULL,
	`no_evidence` integer DEFAULT false NOT NULL,
	`priority` text DEFAULT 'Normal' NOT NULL,
	`reviewer_user_id` text,
	`review_started_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_permission_reports`("id", "public_id", "created_by_user_id", "permission_type", "target_player_name", "target_player_id", "target_discord_id", "reason", "incident_at", "status", "no_evidence", "priority", "reviewer_user_id", "review_started_at", "created_at", "updated_at", "archived_at") SELECT "id", "public_id", "created_by_user_id", "permission_type", "target_player_name", "target_player_id", "target_discord_id", "reason", "incident_at", "status", "no_evidence", "priority", "reviewer_user_id", "review_started_at", "created_at", "updated_at", "archived_at" FROM `permission_reports`;--> statement-breakpoint
DROP TABLE `permission_reports`;--> statement-breakpoint
ALTER TABLE `__new_permission_reports` RENAME TO `permission_reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_permission_reports_public_id` ON `permission_reports` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_owner_created` ON `permission_reports` (`created_by_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_status_created` ON `permission_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_permission` ON `permission_reports` (`permission_type`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_target_player` ON `permission_reports` (`target_player_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_target_discord` ON `permission_reports` (`target_discord_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_reviewer` ON `permission_reports` (`reviewer_user_id`);
--> statement-breakpoint
PRAGMA optimize;
