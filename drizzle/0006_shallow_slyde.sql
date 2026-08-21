CREATE TABLE `trellis_media_variant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteId` text DEFAULT 'default' NOT NULL,
	`assetId` integer NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`storageKey` text NOT NULL,
	`mimeType` text(128) NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assetId`) REFERENCES `trellis_media_asset`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trellis_media_variant_url_unique` ON `trellis_media_variant` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_variant_asset_kind_idx` ON `trellis_media_variant` (`assetId`,`kind`);--> statement-breakpoint
CREATE INDEX `media_variant_site_idx` ON `trellis_media_variant` (`siteId`,`assetId`);--> statement-breakpoint
ALTER TABLE `trellis_cms_site` ADD `storageQuotaBytes` integer DEFAULT 1073741824 NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `title` text(512);--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `caption` text(2000);--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `folder` text(256) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `focalX` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `focalY` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `checksum` text(64);--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `dominantColor` text(7);--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `blurDataUrl` text;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `status` text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `updatedAt` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `media_asset_checksum_idx` ON `trellis_media_asset` (`siteId`,`checksum`);