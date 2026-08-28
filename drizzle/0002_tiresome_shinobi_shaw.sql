ALTER TABLE `hadlock_company` ADD `seoTitle` text(512);--> statement-breakpoint
ALTER TABLE `hadlock_company` ADD `seoDescription` text(1000);--> statement-breakpoint
ALTER TABLE `hadlock_company` ADD `ogImage` text;--> statement-breakpoint
ALTER TABLE `hadlock_company` ADD `canonical` text;--> statement-breakpoint
ALTER TABLE `hadlock_company` ADD `noIndex` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `hadlock_post` ADD `seoTitle` text(512);--> statement-breakpoint
ALTER TABLE `hadlock_post` ADD `seoDescription` text(1000);--> statement-breakpoint
ALTER TABLE `hadlock_post` ADD `ogImage` text;--> statement-breakpoint
ALTER TABLE `hadlock_post` ADD `canonical` text;--> statement-breakpoint
ALTER TABLE `hadlock_post` ADD `noIndex` integer DEFAULT false NOT NULL;