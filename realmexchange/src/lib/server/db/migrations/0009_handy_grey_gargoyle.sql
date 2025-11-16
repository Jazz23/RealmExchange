ALTER TABLE `trade_listing` RENAME COLUMN "account_guids" TO "account_names";--> statement-breakpoint
ALTER TABLE `trade_offer` RENAME COLUMN "offer_account_guids" TO "offer_account_names";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`owner_id` text NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`guid` text NOT NULL,
	`password` text NOT NULL,
	`name` text PRIMARY KEY NOT NULL,
	`inventory_raw` text DEFAULT '' NOT NULL,
	`seasonal` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_account`("owner_id", "verified", "guid", "password", "name", "inventory_raw", "seasonal") SELECT "owner_id", "verified", "guid", "password", "name", "inventory_raw", "seasonal" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;