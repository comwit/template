CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cart_items_quantity_check" CHECK("cart_items"."quantity" BETWEEN 1 AND 99)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_items_sku_uq` ON `cart_items` (`cart_id`,`sku_id`);--> statement-breakpoint
CREATE INDEX `cart_items_sku_idx` ON `cart_items` (`sku_id`);--> statement-breakpoint
CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `carts_customer_uq` ON `carts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_uq` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_list_idx` ON `categories` (`deleted_at`,`name`);--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`sku_id` text NOT NULL,
	`order_id` text,
	`quantity` integer NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`actor_id` text NOT NULL,
	`request_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movements_request_uq` ON `inventory_movements` (`request_key`);--> statement-breakpoint
CREATE INDEX `movements_sku_idx` ON `inventory_movements` (`sku_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `movements_order_idx` ON `inventory_movements` (`order_id`);--> statement-breakpoint
CREATE INDEX `movements_date_idx` ON `inventory_movements` (`created_at`);--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'held' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reservations_quantity_check" CHECK("inventory_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_order_sku_uq` ON `inventory_reservations` (`order_id`,`sku_id`);--> statement-breakpoint
CREATE INDEX `reservations_expiry_idx` ON `inventory_reservations` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `reservations_sku_idx` ON `inventory_reservations` (`sku_id`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`image` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_storage_key_uq` ON `media_assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `media_owner_idx` ON `media_assets` (`owner_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`product_name` text NOT NULL,
	`sku_code` text NOT NULL,
	`options` text NOT NULL,
	`image` text,
	`unit_price` integer NOT NULL,
	`quantity` integer NOT NULL,
	`refunded_quantity` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_items_quantity_check" CHECK("order_items"."quantity" > 0 AND "order_items"."refunded_quantity" BETWEEN 0 AND "order_items"."quantity"),
	CONSTRAINT "order_items_price_check" CHECK("order_items"."unit_price" > 0)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_sku_idx` ON `order_items` (`sku_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`customer_id` text NOT NULL,
	`request_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`subtotal` integer NOT NULL,
	`shipping_fee` integer NOT NULL,
	`total` integer NOT NULL,
	`shipping_address` text NOT NULL,
	`customer_email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_amount_check" CHECK("orders"."subtotal" >= 0 AND "orders"."shipping_fee" >= 0 AND "orders"."total" = "orders"."subtotal" + "orders"."shipping_fee")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_uq` ON `orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_uq` ON `orders` (`customer_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`deleted_at`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_payment_idx` ON `orders` (`payment_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_expiry_idx` ON `orders` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider_order_id` text NOT NULL,
	`payment_key` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`amount` integer NOT NULL,
	`refunded_amount` integer DEFAULT 0 NOT NULL,
	`idempotency_key` text NOT NULL,
	`pending_refund_id` text,
	`mode` text NOT NULL,
	`method` text,
	`receipt_url` text,
	`last_error` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payments_amount_check" CHECK("payments"."amount" > 0 AND "payments"."refunded_amount" BETWEEN 0 AND "payments"."amount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_uq` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_order_uq` ON `payments` (`provider_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_key_uq` ON `payments` (`payment_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_idempotency_uq` ON `payments` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `payments_date_idx` ON `payments` (`created_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_uq` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_list_idx` ON `products` (`deleted_at`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `refund_items` (
	`id` text PRIMARY KEY NOT NULL,
	`refund_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`refund_id`) REFERENCES `refunds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "refund_items_quantity_check" CHECK("refund_items"."quantity" > 0 AND "refund_items"."amount" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refund_items_uq` ON `refund_items` (`refund_id`,`order_item_id`);--> statement-breakpoint
CREATE INDEX `refund_items_order_item_idx` ON `refund_items` (`order_item_id`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`order_id` text NOT NULL,
	`request_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount` integer NOT NULL,
	`shipping_amount` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`restock` integer DEFAULT false NOT NULL,
	`actor_id` text NOT NULL,
	`provider_transaction_key` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "refunds_amount_check" CHECK("refunds"."amount" > 0 AND "refunds"."shipping_amount" BETWEEN 0 AND "refunds"."amount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_request_uq` ON `refunds` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_transaction_uq` ON `refunds` (`provider_transaction_key`);--> statement-breakpoint
CREATE INDEX `refunds_payment_idx` ON `refunds` (`payment_id`,`status`);--> statement-breakpoint
CREATE INDEX `refunds_order_idx` ON `refunds` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `refunds_status_idx` ON `refunds` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`carrier` text NOT NULL,
	`tracking_number` text NOT NULL,
	`status` text DEFAULT 'shipped' NOT NULL,
	`shipped_at` integer NOT NULL,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipments_order_uq` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE INDEX `shipments_tracking_idx` ON `shipments` (`carrier`,`tracking_number`);--> statement-breakpoint
CREATE TABLE `skus` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`code` text NOT NULL,
	`option_key` text NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`price` integer NOT NULL,
	`on_hand` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "skus_stock_check" CHECK("skus"."on_hand" >= 0 AND "skus"."reserved" >= 0 AND "skus"."reserved" <= "skus"."on_hand"),
	CONSTRAINT "skus_price_check" CHECK("skus"."price" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skus_code_uq` ON `skus` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `skus_options_uq` ON `skus` (`product_id`,`option_key`);--> statement-breakpoint
CREATE INDEX `skus_stock_idx` ON `skus` (`deleted_at`,`active`,`on_hand`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`payment_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhooks_key_uq` ON `webhook_events` (`event_key`);--> statement-breakpoint
CREATE INDEX `webhooks_retry_idx` ON `webhook_events` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `webhooks_payment_idx` ON `webhook_events` (`payment_key`);--> statement-breakpoint
CREATE TABLE `app_auth__account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `app_auth_account_user_idx` ON `app_auth__account` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_auth_account_provider_uq` ON `app_auth__account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `app_auth__session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_auth__session_token_unique` ON `app_auth__session` (`token`);--> statement-breakpoint
CREATE INDEX `app_auth_session_user_idx` ON `app_auth__session` (`userId`);--> statement-breakpoint
CREATE INDEX `app_auth_session_expiry_idx` ON `app_auth__session` (`expiresAt`);--> statement-breakpoint
CREATE TABLE `app_auth__user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_auth__user_email_unique` ON `app_auth__user` (`email`);--> statement-breakpoint
CREATE INDEX `app_auth_user_created_idx` ON `app_auth__user` (`createdAt`);--> statement-breakpoint
CREATE TABLE `app_auth__verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `app_auth_verification_identifier_idx` ON `app_auth__verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `admin_auth__account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `admin_auth__user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_auth_account_user_idx` ON `admin_auth__account` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_auth_account_provider_uq` ON `admin_auth__account` (`providerId`,`accountId`);--> statement-breakpoint
CREATE TABLE `admin_auth__session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`impersonatedBy` text,
	FOREIGN KEY (`userId`) REFERENCES `admin_auth__user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_auth__session_token_unique` ON `admin_auth__session` (`token`);--> statement-breakpoint
CREATE INDEX `admin_auth_session_user_idx` ON `admin_auth__session` (`userId`);--> statement-breakpoint
CREATE INDEX `admin_auth_session_expiry_idx` ON `admin_auth__session` (`expiresAt`);--> statement-breakpoint
CREATE TABLE `admin_auth__user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`banReason` text,
	`banExpires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_auth__user_email_unique` ON `admin_auth__user` (`email`);--> statement-breakpoint
CREATE INDEX `admin_auth_user_created_idx` ON `admin_auth__user` (`createdAt`);--> statement-breakpoint
CREATE TABLE `admin_auth__verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `admin_auth_verification_identifier_idx` ON `admin_auth__verification` (`identifier`);