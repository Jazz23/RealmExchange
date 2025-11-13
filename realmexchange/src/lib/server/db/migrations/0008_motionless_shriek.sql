CREATE TABLE `trade_listing` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`account_guids` text NOT NULL,
	`asking_price` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trade_offer` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`offer_account_guids` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `trade_listing`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
