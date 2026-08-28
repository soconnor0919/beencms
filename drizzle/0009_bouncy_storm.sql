CREATE TABLE `hadlock_analytics_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteId` text NOT NULL,
	`kind` text NOT NULL,
	`name` text(128),
	`path` text(2048) NOT NULL,
	`referrer` text(512),
	`visitorHash` text(64),
	`device` text DEFAULT 'unknown' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`siteId`) REFERENCES `hadlock_cms_site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `analytics_event_site_created_idx` ON `hadlock_analytics_event` (`siteId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `analytics_event_site_path_idx` ON `hadlock_analytics_event` (`siteId`,`path`);--> statement-breakpoint
CREATE INDEX `analytics_event_visitor_idx` ON `hadlock_analytics_event` (`siteId`,`visitorHash`);--> statement-breakpoint
CREATE TABLE `hadlock_analytics_settings` (
	`siteId` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`retentionDays` integer DEFAULT 90 NOT NULL,
	`lastPrunedAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`siteId`) REFERENCES `hadlock_cms_site`(`id`) ON UPDATE no action ON DELETE cascade
);
