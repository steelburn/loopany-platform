CREATE TABLE `notification_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_channels_team_idx` ON `notification_channels` (`team_id`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_members_team_idx` ON `team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `loops` ADD `team_id` text;--> statement-breakpoint
ALTER TABLE `loops` ADD `channel_id` text;--> statement-breakpoint
CREATE INDEX `loops_team_idx` ON `loops` (`team_id`);--> statement-breakpoint
ALTER TABLE `machines` ADD `team_id` text;--> statement-breakpoint
CREATE INDEX `machines_team_idx` ON `machines` (`team_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `teams` (`id`, `name`, `owner_user_id`, `created_at`) SELECT 'team-' || u, CASE WHEN u = 'shared' THEN 'Shared Workspace' ELSE 'Personal Team' END, CASE WHEN u = 'shared' THEN NULL ELSE u END, strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM (SELECT user_id AS u FROM `machines` UNION SELECT user_id AS u FROM `loops`);--> statement-breakpoint
INSERT OR IGNORE INTO `team_members` (`id`, `team_id`, `user_id`, `role`, `created_at`) SELECT 'team-' || u || ':' || u, 'team-' || u, u, 'owner', strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM (SELECT user_id AS u FROM `machines` UNION SELECT user_id AS u FROM `loops`) WHERE u <> 'shared';--> statement-breakpoint
UPDATE `machines` SET `team_id` = 'team-' || `user_id` WHERE `team_id` IS NULL;--> statement-breakpoint
UPDATE `loops` SET `team_id` = 'team-' || `user_id` WHERE `team_id` IS NULL;