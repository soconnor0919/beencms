CREATE TABLE `trellis_site_publication` (
	`id` text PRIMARY KEY NOT NULL,
	`siteId` text NOT NULL,
	`status` text DEFAULT 'succeeded' NOT NULL,
	`summary` text DEFAULT '{}' NOT NULL,
	`error` text,
	`createdBy` text,
	`createdEmail` text(256),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`siteId`) REFERENCES `trellis_cms_site`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `trellis_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `site_publication_site_idx` ON `trellis_site_publication` (`siteId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `trellis_site_template` (
	`id` text PRIMARY KEY NOT NULL,
	`siteId` text NOT NULL,
	`name` text(256) NOT NULL,
	`description` text(1000),
	`category` text(128) DEFAULT 'custom' NOT NULL,
	`thumbnailUrl` text,
	`snapshot` text NOT NULL,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`siteId`) REFERENCES `trellis_cms_site`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `trellis_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_template_name_idx` ON `trellis_site_template` (`siteId`,`name`);--> statement-breakpoint
ALTER TABLE `trellis_cms_site` ADD `domainStatus` text DEFAULT 'unconfigured' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_cms_site` ADD `domainVerificationToken` text(128);--> statement-breakpoint
ALTER TABLE `trellis_cms_site` ADD `domainVerifiedAt` integer;