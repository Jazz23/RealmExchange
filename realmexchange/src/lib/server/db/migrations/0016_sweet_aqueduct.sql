PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password_hash` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`email_verification_token` text,
	`email_verification_expires_at` integer,
	`google_id` text,
	`password_reset_token` text,
	`password_reset_expires_at` integer,
	`email_notifications` integer DEFAULT true NOT NULL,
	`hwid` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "username", "email", "password_hash", "email_verified", "email_verification_token", "email_verification_expires_at", "google_id", "password_reset_token", "password_reset_expires_at", "email_notifications", "hwid") SELECT "id", "username", "email", "password_hash", "email_verified", "email_verification_token", "email_verification_expires_at", "google_id", "password_reset_token", "password_reset_expires_at", "email_notifications", "hwid" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_google_id_unique` ON `user` (`google_id`);