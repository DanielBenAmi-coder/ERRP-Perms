CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` integer,
	`actor_user_id` text,
	`action` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`ip_hash` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `permission_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_report_created` ON `audit_logs` (`report_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor_created` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` integer NOT NULL,
	`kind` text NOT NULL,
	`object_key` text,
	`external_url` text,
	`file_name` text,
	`mime_type` text,
	`size_bytes` integer,
	`uploaded_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `permission_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_report_id` ON `evidence` (`report_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`report_id` integer,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`report_id`) REFERENCES `permission_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `permission_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`permission_type` text NOT NULL,
	`target_player_name` text NOT NULL,
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
CREATE UNIQUE INDEX `idx_permission_reports_public_id` ON `permission_reports` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_owner_created` ON `permission_reports` (`created_by_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_status_created` ON `permission_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_permission` ON `permission_reports` (`permission_type`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_target_player` ON `permission_reports` (`target_player_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_target_discord` ON `permission_reports` (`target_discord_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_reports_reviewer` ON `permission_reports` (`reviewer_user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`staff_rank` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer NOT NULL,
	`last_sync_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_discord_id` ON `users` (`discord_id`);