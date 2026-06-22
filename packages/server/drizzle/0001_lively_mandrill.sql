CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`machine_id` text NOT NULL,
	`intent` text NOT NULL,
	`prior` text,
	`status` text NOT NULL,
	`result` text,
	`error` text,
	`ts` text NOT NULL,
	`created_at` text NOT NULL
);
