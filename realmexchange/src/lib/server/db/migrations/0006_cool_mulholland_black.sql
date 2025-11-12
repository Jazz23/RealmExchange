PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`owner_id` text NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`guid` text PRIMARY KEY NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`inventory_raw` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_account`("owner_id", "verified", "guid", "password", "name", "inventory_raw") SELECT "owner_id", "verified", "guid", "password", "name", "inventory_raw" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;