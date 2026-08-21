DROP INDEX `trellis_company_slug_unique`;--> statement-breakpoint
DROP INDEX `company_slug_idx`;--> statement-breakpoint
DROP INDEX `company_order_idx`;--> statement-breakpoint
ALTER TABLE `trellis_company` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `company_slug_idx` ON `trellis_company` (`siteId`,`slug`);--> statement-breakpoint
CREATE INDEX `company_order_idx` ON `trellis_company` (`siteId`,`order`);--> statement-breakpoint
DROP INDEX `trellis_page_layout_page_unique`;--> statement-breakpoint
ALTER TABLE `trellis_page_layout` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `page_layout_site_page_idx` ON `trellis_page_layout` (`siteId`,`page`);--> statement-breakpoint
DROP INDEX `trellis_post_slug_unique`;--> statement-breakpoint
DROP INDEX `post_slug_idx`;--> statement-breakpoint
DROP INDEX `post_status_idx`;--> statement-breakpoint
DROP INDEX `post_published_idx`;--> statement-breakpoint
ALTER TABLE `trellis_post` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `post_slug_idx` ON `trellis_post` (`siteId`,`slug`);--> statement-breakpoint
CREATE INDEX `post_status_idx` ON `trellis_post` (`siteId`,`status`);--> statement-breakpoint
CREATE INDEX `post_published_idx` ON `trellis_post` (`siteId`,`publishedAt`);--> statement-breakpoint
DROP INDEX `trellis_redirect_fromPath_unique`;--> statement-breakpoint
ALTER TABLE `trellis_redirect` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `redirect_site_path_idx` ON `trellis_redirect` (`siteId`,`fromPath`);--> statement-breakpoint
DROP INDEX `editorial_workflow_entity_idx`;--> statement-breakpoint
ALTER TABLE `trellis_editorial_workflow` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_workflow_entity_idx` ON `trellis_editorial_workflow` (`siteId`,`entityType`,`entityId`);--> statement-breakpoint
DROP INDEX `page_content_idx`;--> statement-breakpoint
ALTER TABLE `trellis_page_content` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE INDEX `page_content_idx` ON `trellis_page_content` (`siteId`,`page`,`key`);--> statement-breakpoint
DROP INDEX `team_order_idx`;--> statement-breakpoint
ALTER TABLE `trellis_team_member` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE INDEX `team_order_idx` ON `trellis_team_member` (`siteId`,`order`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trellis_page_seo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteId` text DEFAULT 'default' NOT NULL,
	`page` text(128) NOT NULL,
	`title` text(512),
	`description` text(1000),
	`ogImage` text,
	`canonical` text,
	`noIndex` integer DEFAULT false NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
INSERT INTO `__new_trellis_page_seo`("siteId", "page", "title", "description", "ogImage", "canonical", "noIndex", "updatedAt") SELECT 'default', "page", "title", "description", "ogImage", "canonical", "noIndex", "updatedAt" FROM `trellis_page_seo`;--> statement-breakpoint
DROP TABLE `trellis_page_seo`;--> statement-breakpoint
ALTER TABLE `__new_trellis_page_seo` RENAME TO `trellis_page_seo`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `page_seo_site_page_idx` ON `trellis_page_seo` (`siteId`,`page`);--> statement-breakpoint
ALTER TABLE `trellis_audit_log` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_calendar_event` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_cms_site` ADD `mcpTokenHash` text(128);--> statement-breakpoint
ALTER TABLE `trellis_company_page` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_contact_submission` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_contact_throttle` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_content_revision` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_editorial_comment` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_media_asset` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_operation_event` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_site_settings` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `site_settings_site_idx` ON `trellis_site_settings` (`siteId`);--> statement-breakpoint
ALTER TABLE `trellis_user_invitation` ADD `siteId` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_user_profile` ADD `displayName` text(256);--> statement-breakpoint
ALTER TABLE `trellis_user_profile` ADD `bio` text(1000);--> statement-breakpoint
ALTER TABLE `trellis_user_profile` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `trellis_user_profile` ADD `timezone` text(80) DEFAULT 'America/New_York' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_user_profile` ADD `locale` text(32) DEFAULT 'en-US' NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_user_profile` ADD `emailNotifications` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `trellis_webhook_endpoint` ADD `siteId` text DEFAULT 'default' NOT NULL;
