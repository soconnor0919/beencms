CREATE TABLE `hadlock_account` (
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
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hadlock_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text,
	`userEmail` text(256),
	`action` text(128) NOT NULL,
	`entity` text(128),
	`detail` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `hadlock_audit_log` (`createdAt`);--> statement-breakpoint
CREATE TABLE `hadlock_calendar_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text(512) NOT NULL,
	`description` text,
	`location` text(1000),
	`url` text,
	`startAt` integer NOT NULL,
	`endAt` integer NOT NULL,
	`allDay` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `calendar_event_start_idx` ON `hadlock_calendar_event` (`startAt`);--> statement-breakpoint
CREATE INDEX `calendar_event_status_idx` ON `hadlock_calendar_event` (`status`);--> statement-breakpoint
CREATE TABLE `hadlock_cms_site` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(256) NOT NULL,
	`slug` text(128) NOT NULL,
	`hostname` text(256),
	`locale` text(32) DEFAULT 'en-US' NOT NULL,
	`timezone` text(80) DEFAULT 'America/New_York' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_cms_site_slug_unique` ON `hadlock_cms_site` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_cms_site_hostname_unique` ON `hadlock_cms_site` (`hostname`);--> statement-breakpoint
CREATE TABLE `hadlock_company` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`slug` text(256) NOT NULL,
	`tagline` text(512),
	`description` text,
	`imageUrl` text,
	`status` text DEFAULT 'active' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_company_slug_unique` ON `hadlock_company` (`slug`);--> statement-breakpoint
CREATE INDEX `company_slug_idx` ON `hadlock_company` (`slug`);--> statement-breakpoint
CREATE INDEX `company_order_idx` ON `hadlock_company` (`order`);--> statement-breakpoint
CREATE TABLE `hadlock_company_page` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`layout` text DEFAULT '[]' NOT NULL,
	`draftLayout` text,
	`updatedAt` integer,
	FOREIGN KEY (`companyId`) REFERENCES `hadlock_company`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hadlock_contact_submission` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`email` text(256) NOT NULL,
	`subject` text(512),
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hadlock_contact_throttle` (
	`key` text(128) PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`windowStart` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hadlock_content_revision` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text(256) NOT NULL,
	`snapshot` text NOT NULL,
	`createdBy` text,
	`createdEmail` text(256),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_revision_entity_idx` ON `hadlock_content_revision` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `hadlock_custom_form` (
	`id` text PRIMARY KEY NOT NULL,
	`siteId` text DEFAULT 'default' NOT NULL,
	`name` text(256) NOT NULL,
	`slug` text(256) NOT NULL,
	`fields` text DEFAULT '[]' NOT NULL,
	`submitLabel` text(128) DEFAULT 'Submit' NOT NULL,
	`successMessage` text DEFAULT 'Thank you. Your response has been received.' NOT NULL,
	`notificationEmail` text(256),
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_form_slug_idx` ON `hadlock_custom_form` (`siteId`,`slug`);--> statement-breakpoint
CREATE TABLE `hadlock_custom_form_submission` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`formId` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`assignedTo` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`formId`) REFERENCES `hadlock_custom_form`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignedTo`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `custom_form_submission_idx` ON `hadlock_custom_form_submission` (`formId`,`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `hadlock_dynamic_page` (
	`id` text PRIMARY KEY NOT NULL,
	`siteId` text DEFAULT 'default' NOT NULL,
	`parentId` text,
	`title` text(512) NOT NULL,
	`slug` text(512) NOT NULL,
	`locale` text(32) DEFAULT 'en-US' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`layout` text DEFAULT '[]' NOT NULL,
	`draftLayout` text,
	`seoTitle` text(512),
	`seoDescription` text(1000),
	`ogImage` text,
	`canonical` text,
	`noIndex` integer DEFAULT false NOT NULL,
	`publishAt` integer,
	`unpublishAt` integer,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dynamic_page_path_locale_idx` ON `hadlock_dynamic_page` (`siteId`,`slug`,`locale`);--> statement-breakpoint
CREATE INDEX `dynamic_page_parent_idx` ON `hadlock_dynamic_page` (`siteId`,`parentId`);--> statement-breakpoint
CREATE INDEX `dynamic_page_status_idx` ON `hadlock_dynamic_page` (`siteId`,`status`);--> statement-breakpoint
CREATE TABLE `hadlock_editorial_comment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entityType` text(64) NOT NULL,
	`entityId` text(256) NOT NULL,
	`body` text NOT NULL,
	`authorId` text,
	`resolvedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`authorId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `editorial_comment_entity_idx` ON `hadlock_editorial_comment` (`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `hadlock_editorial_workflow` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text(256) NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`assignedTo` text,
	`lockedBy` text,
	`lockedAt` integer,
	`publishAt` integer,
	`unpublishAt` integer,
	`updatedBy` text,
	`updatedAt` integer,
	FOREIGN KEY (`assignedTo`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`lockedBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updatedBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editorial_workflow_entity_idx` ON `hadlock_editorial_workflow` (`entityType`,`entityId`);--> statement-breakpoint
CREATE TABLE `hadlock_media_asset` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`filename` text(512) NOT NULL,
	`mimeType` text(128) NOT NULL,
	`size` integer NOT NULL,
	`storageKey` text,
	`width` integer,
	`height` integer,
	`alt` text(1000) DEFAULT '' NOT NULL,
	`uploadedBy` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uploadedBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_media_asset_url_unique` ON `hadlock_media_asset` (`url`);--> statement-breakpoint
CREATE TABLE `hadlock_operation_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`source` text(128) NOT NULL,
	`message` text NOT NULL,
	`detail` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `operation_event_created_idx` ON `hadlock_operation_event` (`createdAt`);--> statement-breakpoint
CREATE TABLE `hadlock_page_content` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page` text(128) NOT NULL,
	`key` text(128) NOT NULL,
	`value` text NOT NULL,
	`draftValue` text,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `page_content_idx` ON `hadlock_page_content` (`page`,`key`);--> statement-breakpoint
CREATE TABLE `hadlock_page_layout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page` text(128) NOT NULL,
	`layout` text DEFAULT '[]' NOT NULL,
	`draftLayout` text,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_page_layout_page_unique` ON `hadlock_page_layout` (`page`);--> statement-breakpoint
CREATE TABLE `hadlock_page_seo` (
	`page` text(128) PRIMARY KEY NOT NULL,
	`title` text(512),
	`description` text(1000),
	`ogImage` text,
	`canonical` text,
	`noIndex` integer DEFAULT false NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `hadlock_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text(512) NOT NULL,
	`slug` text(256) NOT NULL,
	`excerpt` text,
	`coverImage` text,
	`layout` text DEFAULT '[]' NOT NULL,
	`draftLayout` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`publishedAt` integer,
	`scheduledAt` integer,
	`category` text(128),
	`kind` text DEFAULT 'article' NOT NULL,
	`byline` text(256),
	`sourceUrl` text,
	`authorId` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`authorId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_post_slug_unique` ON `hadlock_post` (`slug`);--> statement-breakpoint
CREATE INDEX `post_slug_idx` ON `hadlock_post` (`slug`);--> statement-breakpoint
CREATE INDEX `post_status_idx` ON `hadlock_post` (`status`);--> statement-breakpoint
CREATE INDEX `post_published_idx` ON `hadlock_post` (`publishedAt`);--> statement-breakpoint
CREATE TABLE `hadlock_post_term` (
	`postId` integer NOT NULL,
	`termId` integer NOT NULL,
	FOREIGN KEY (`postId`) REFERENCES `hadlock_post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`termId`) REFERENCES `hadlock_taxonomy_term`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_term_unique_idx` ON `hadlock_post_term` (`postId`,`termId`);--> statement-breakpoint
CREATE TABLE `hadlock_redirect` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fromPath` text(512) NOT NULL,
	`toPath` text(512) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_redirect_fromPath_unique` ON `hadlock_redirect` (`fromPath`);--> statement-breakpoint
CREATE TABLE `hadlock_reusable_block` (
	`id` text PRIMARY KEY NOT NULL,
	`siteId` text DEFAULT 'default' NOT NULL,
	`name` text(256) NOT NULL,
	`category` text(128),
	`content` text DEFAULT '[]' NOT NULL,
	`draftContent` text,
	`createdBy` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reusable_block_name_idx` ON `hadlock_reusable_block` (`siteId`,`name`);--> statement-breakpoint
CREATE TABLE `hadlock_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_session_token_unique` ON `hadlock_session` (`token`);--> statement-breakpoint
CREATE TABLE `hadlock_site_membership` (
	`siteId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`siteId`) REFERENCES `hadlock_cms_site`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_membership_unique_idx` ON `hadlock_site_membership` (`siteId`,`userId`);--> statement-breakpoint
CREATE TABLE `hadlock_site_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteName` text DEFAULT 'New Site' NOT NULL,
	`siteUrl` text,
	`logoUrl` text,
	`iconUrl` text,
	`themePreset` text DEFAULT 'foundation' NOT NULL,
	`cornerStyle` text DEFAULT 'rounded' NOT NULL,
	`contentAlignment` text DEFAULT 'left' NOT NULL,
	`onboardingComplete` integer DEFAULT false NOT NULL,
	`primaryColor` text DEFAULT '#0076a0' NOT NULL,
	`accentColor` text DEFAULT '#f4f1ea' NOT NULL,
	`textColor` text DEFAULT '#171716' NOT NULL,
	`bodyFont` text DEFAULT 'Geist' NOT NULL,
	`headingFont` text DEFAULT 'Rajdhani' NOT NULL,
	`navLinks` text DEFAULT '[]' NOT NULL,
	`footerTagline` text,
	`contactEmail` text,
	`contactPhone` text,
	`address` text,
	`socialLinks` text DEFAULT '[]' NOT NULL,
	`seoTitle` text,
	`seoDescription` text,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `hadlock_taxonomy_term` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siteId` text DEFAULT 'default' NOT NULL,
	`type` text NOT NULL,
	`name` text(256) NOT NULL,
	`slug` text(256) NOT NULL,
	`parentId` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `taxonomy_term_slug_idx` ON `hadlock_taxonomy_term` (`siteId`,`type`,`slug`);--> statement-breakpoint
CREATE TABLE `hadlock_team_member` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`role` text(256) NOT NULL,
	`bio` text,
	`imageUrl` text,
	`order` integer DEFAULT 0 NOT NULL,
	`isAffiliate` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `team_order_idx` ON `hadlock_team_member` (`order`);--> statement-breakpoint
CREATE TABLE `hadlock_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_user_email_unique` ON `hadlock_user` (`email`);--> statement-breakpoint
CREATE TABLE `hadlock_user_invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text(256) NOT NULL,
	`name` text(256) NOT NULL,
	`role` text NOT NULL,
	`tokenHash` text(128) NOT NULL,
	`invitedBy` text,
	`expiresAt` integer NOT NULL,
	`acceptedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invitedBy`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hadlock_user_invitation_tokenHash_unique` ON `hadlock_user_invitation` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `user_invitation_email_idx` ON `hadlock_user_invitation` (`email`);--> statement-breakpoint
CREATE TABLE `hadlock_user_profile` (
	`userId` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hadlock_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()),
	`updatedAt` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `hadlock_webhook_delivery` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpointId` text,
	`event` text(128) NOT NULL,
	`responseCode` integer,
	`success` integer DEFAULT false NOT NULL,
	`error` text,
	`attemptedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`endpointId`) REFERENCES `hadlock_webhook_endpoint`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `webhook_delivery_attempt_idx` ON `hadlock_webhook_delivery` (`attemptedAt`);--> statement-breakpoint
CREATE TABLE `hadlock_webhook_endpoint` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(256) NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
