ALTER TABLE `account` ADD `owner_id` text NOT NULL REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `account` ADD `verified` integer DEFAULT 0 NOT NULL;