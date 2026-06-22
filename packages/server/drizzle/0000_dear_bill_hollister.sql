CREATE TABLE `loops` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`machine_id` text NOT NULL,
	`name` text,
	`cron` text NOT NULL,
	`task` text,
	`workdir` text,
	`task_file` text,
	`workflow` text,
	`ui` text,
	`state_schema` text,
	`notify` text DEFAULT 'auto' NOT NULL,
	`allow_control` integer DEFAULT false NOT NULL,
	`model` text,
	`enabled` integer DEFAULT true NOT NULL,
	`next_run_at` text,
	`state` text,
	`evolved_run_count` integer,
	`evolve_due` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `loops_user_idx` ON `loops` (`user_id`);--> statement-breakpoint
CREATE INDEX `loops_machine_idx` ON `loops` (`machine_id`);--> statement-breakpoint
CREATE TABLE `machines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`hostname` text,
	`platform` text,
	`arch` text,
	`token_hash` text NOT NULL,
	`token` text,
	`roots` text,
	`last_seen` text,
	`online` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `machines_user_idx` ON `machines` (`user_id`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`loop_id` text NOT NULL,
	`user_id` text NOT NULL,
	`machine_id` text NOT NULL,
	`phase` text NOT NULL,
	`role` text NOT NULL,
	`ts` text NOT NULL,
	`outcome` text,
	`status` text,
	`message` text,
	`duration_ms` integer,
	`error` text,
	`sample` real,
	`state` text,
	`control` text,
	`session_id` text
);
--> statement-breakpoint
CREATE INDEX `runs_loop_idx` ON `runs` (`loop_id`);--> statement-breakpoint
CREATE INDEX `runs_phase_idx` ON `runs` (`phase`);--> statement-breakpoint
CREATE INDEX `runs_loop_ts_idx` ON `runs` (`loop_id`,`ts`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);