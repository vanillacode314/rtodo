CREATE TABLE `messages` (
	`timestamp` text PRIMARY KEY NOT NULL,
	`user_intent` text NOT NULL,
	`updates` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`createdAt` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parentId` text,
	`updatedAt` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`parentId`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nodes_name_parentId_unique` ON `nodes` (`name`,`parentId`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`index` real DEFAULT 0 NOT NULL,
	`nodeId` text,
	`body` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`goesOffAt` integer,
	`repeatsEvery` text,
	`deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`nodeId`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
