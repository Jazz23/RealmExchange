CREATE TABLE `account` (
	`guid` text PRIMARY KEY NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`inventory_raw` text NOT NULL
);
--> statement-breakpoint
DROP TABLE `recaptcha_tokens`;