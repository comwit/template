CREATE TABLE `commerce_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	CONSTRAINT "commerce_revision_valid" CHECK("commerce_revision"."revision" >= 0)
);
