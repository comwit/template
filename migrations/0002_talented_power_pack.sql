CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`order_id` text NOT NULL,
	`event` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`attempt_key` text,
	`message_id` text,
	`last_error` text,
	`attempted_at` integer,
	`next_check_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_event_uq` ON `notifications` (`event_key`);--> statement-breakpoint
CREATE INDEX `notifications_worker_idx` ON `notifications` (`status`,`next_check_at`);--> statement-breakpoint
CREATE INDEX `notifications_order_idx` ON `notifications` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_date_idx` ON `notifications` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `notifications_message_idx` ON `notifications` (`message_id`);