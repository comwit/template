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
CREATE TABLE `banners` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`image` text NOT NULL,
	`link_url` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `banners_list_idx` ON `banners` (`deleted_at`,`active`,`position`);--> statement-breakpoint
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
CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`issued_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_number_uq` ON `certificates` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_enrollment_uq` ON `certificates` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `certificates_user_idx` ON `certificates` (`user_id`,`issued_at`);--> statement-breakpoint
CREATE TABLE `commerce_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	CONSTRAINT "commerce_revision_valid" CHECK("commerce_revision"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`user_id` text NOT NULL,
	`order_id` text NOT NULL,
	`status` text DEFAULT 'held' NOT NULL,
	`discount` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupon_redemptions_order_uq` ON `coupon_redemptions` (`order_id`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_user_idx` ON `coupon_redemptions` (`coupon_id`,`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`value` integer NOT NULL,
	`min_amount` integer DEFAULT 0 NOT NULL,
	`max_discount` integer,
	`course_id` text,
	`starts_at` integer,
	`ends_at` integer,
	`usage_limit` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`per_user_limit` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "coupons_value_check" CHECK("coupons"."value" > 0),
	CONSTRAINT "coupons_usage_check" CHECK("coupons"."used_count" >= 0 AND ("coupons"."usage_limit" IS NULL OR "coupons"."used_count" <= "coupons"."usage_limit"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_uq` ON `coupons` (`code`);--> statement-breakpoint
CREATE INDEX `coupons_list_idx` ON `coupons` (`deleted_at`,`active`,`created_at`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`instructor_id` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`thumbnail` text,
	`level` text DEFAULT 'beginner' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`discount_price` integer,
	`discount_ends_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`lesson_count` integer DEFAULT 0 NOT NULL,
	`total_duration_seconds` integer DEFAULT 0 NOT NULL,
	`enrollment_count` integer DEFAULT 0 NOT NULL,
	`rating_sum` integer DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "courses_price_check" CHECK("courses"."price" >= 0),
	CONSTRAINT "courses_discount_check" CHECK("courses"."discount_price" IS NULL OR ("courses"."discount_price" >= 0 AND "courses"."discount_price" < "courses"."price"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_uq` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `courses_list_idx` ON `courses` (`deleted_at`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `courses_category_idx` ON `courses` (`category_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `courses_title_idx` ON `courses` (`title`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`order_id` text,
	`source` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`completed_lessons` integer DEFAULT 0 NOT NULL,
	`last_lesson_id` text,
	`expires_at` integer,
	`completed_at` integer,
	`granted_by` text,
	`revoke_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enrollments_progress_check" CHECK("enrollments"."progress_percent" BETWEEN 0 AND 100 AND "enrollments"."completed_lessons" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_course_user_uq` ON `enrollments` (`course_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `enrollments_user_idx` ON `enrollments` (`user_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `enrollments_course_idx` ON `enrollments` (`course_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `enrollments_order_idx` ON `enrollments` (`order_id`);--> statement-breakpoint
CREATE TABLE `instructors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `instructors_list_idx` ON `instructors` (`deleted_at`,`name`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`position_seconds` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lesson_progress_position_check" CHECK("lesson_progress"."position_seconds" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_progress_uq` ON `lesson_progress` (`enrollment_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_progress_lesson_idx` ON `lesson_progress` (`lesson_id`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`section_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`video` text,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`is_preview` integer DEFAULT false NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lessons_duration_check" CHECK("lessons"."duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE INDEX `lessons_course_idx` ON `lessons` (`course_id`,`deleted_at`,`position`);--> statement-breakpoint
CREATE INDEX `lessons_section_idx` ON `lessons` (`section_id`,`deleted_at`,`position`);--> statement-breakpoint
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
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `notices_list_idx` ON `notices` (`deleted_at`,`status`,`pinned`,`published_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`customer_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`request_key` text NOT NULL,
	`course_id` text NOT NULL,
	`course_title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`list_price` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`coupon_id` text,
	`coupon_code` text,
	`coupon_discount` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_amount_check" CHECK("orders"."list_price" >= 0 AND "orders"."discount" >= 0 AND "orders"."coupon_discount" >= 0 AND "orders"."total" >= 0 AND "orders"."total" = "orders"."list_price" - "orders"."discount" - "orders"."coupon_discount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_uq` ON `orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_uq` ON `orders` (`customer_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`deleted_at`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_course_idx` ON `orders` (`course_id`,`status`);--> statement-breakpoint
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
CREATE TABLE `question_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`author_type` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`content` text NOT NULL,
	`is_answer` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `question_comments_question_idx` ON `question_comments` (`question_id`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`lesson_id` text,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`answered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_course_idx` ON `questions` (`course_id`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `questions_lesson_idx` ON `questions` (`lesson_id`,`deleted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `questions_list_idx` ON `questions` (`deleted_at`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `questions_user_idx` ON `questions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `refund_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`decided_by` text,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `refund_requests_order_idx` ON `refund_requests` (`order_id`,`status`);--> statement-breakpoint
CREATE INDEX `refund_requests_list_idx` ON `refund_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`order_id` text NOT NULL,
	`request_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`actor_id` text NOT NULL,
	`provider_transaction_key` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "refunds_amount_check" CHECK("refunds"."amount" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_request_uq` ON `refunds` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_transaction_uq` ON `refunds` (`provider_transaction_key`);--> statement-breakpoint
CREATE INDEX `refunds_payment_idx` ON `refunds` (`payment_id`,`status`);--> statement-breakpoint
CREATE INDEX `refunds_order_idx` ON `refunds` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `refunds_status_idx` ON `refunds` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`rating` integer NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`admin_reply` text,
	`admin_replied_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `app_auth__user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reviews_rating_check" CHECK("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_course_user_uq` ON `reviews` (`course_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `reviews_course_idx` ON `reviews` (`course_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `reviews_list_idx` ON `reviews` (`deleted_at`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sections_course_idx` ON `sections` (`course_id`,`deleted_at`,`position`);--> statement-breakpoint
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