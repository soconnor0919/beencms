CREATE TABLE `hadlock_two_factor` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`backupCodes` text NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `hadlock_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `two_factor_secret_idx` ON `hadlock_two_factor` (`secret`);--> statement-breakpoint
CREATE INDEX `two_factor_user_idx` ON `hadlock_two_factor` (`userId`);--> statement-breakpoint
ALTER TABLE `hadlock_user` ADD `twoFactorEnabled` integer DEFAULT false NOT NULL;