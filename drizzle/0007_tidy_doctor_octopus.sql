CREATE TABLE `trellis_site_subscription` (
	`siteId` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'none' NOT NULL,
	`stripeCustomerId` text(128),
	`stripeSubscriptionId` text(128),
	`stripePriceId` text(128),
	`currentPeriodEnd` integer,
	`cancelAtPeriodEnd` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`siteId`) REFERENCES `trellis_cms_site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trellis_site_subscription_stripeCustomerId_unique` ON `trellis_site_subscription` (`stripeCustomerId`);--> statement-breakpoint
CREATE UNIQUE INDEX `trellis_site_subscription_stripeSubscriptionId_unique` ON `trellis_site_subscription` (`stripeSubscriptionId`);--> statement-breakpoint
CREATE INDEX `site_subscription_status_idx` ON `trellis_site_subscription` (`status`);--> statement-breakpoint
CREATE TABLE `trellis_stripe_webhook_event` (
	`id` text(128) PRIMARY KEY NOT NULL,
	`type` text(128) NOT NULL,
	`processedAt` integer DEFAULT (unixepoch()) NOT NULL
);
