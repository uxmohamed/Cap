CREATE TABLE "accounts" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"userId" varchar(15) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"access_token" text,
	"expires_in" integer,
	"id_token" text,
	"refresh_token" text,
	"refresh_token_expires_in" integer,
	"scope" varchar(255),
	"token_type" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"tempColumn" text,
	CONSTRAINT "accounts_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "auth_api_keys" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(15) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_api_keys_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"type" varchar(6) NOT NULL,
	"content" text NOT NULL,
	"timestamp" real,
	"authorId" varchar(15) NOT NULL,
	"videoId" varchar(15) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"parentCommentId" varchar(15),
	CONSTRAINT "comments_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(16) DEFAULT 'normal' NOT NULL,
	"organizationId" varchar(15) NOT NULL,
	"createdById" varchar(15) NOT NULL,
	"parentId" varchar(15),
	"spaceId" varchar(15),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "folders_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"orgId" varchar(15) NOT NULL,
	"recipientId" varchar(15) NOT NULL,
	"type" varchar(10) NOT NULL,
	"data" jsonb NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "organization_invites" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"organizationId" varchar(15) NOT NULL,
	"invitedEmail" varchar(255) NOT NULL,
	"invitedByUserId" varchar(15) NOT NULL,
	"role" varchar(255) NOT NULL,
	"status" varchar(255) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	CONSTRAINT "organization_invites_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"userId" varchar(15) NOT NULL,
	"organizationId" varchar(15) NOT NULL,
	"role" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"ownerId" varchar(15) NOT NULL,
	"metadata" jsonb,
	"allowedEmailDomain" varchar(255),
	"customDomain" varchar(255),
	"domainVerified" timestamp,
	"iconUrl" varchar(1024),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"workosOrganizationId" varchar(255),
	"workosConnectionId" varchar(255),
	CONSTRAINT "organizations_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "s3_buckets" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"ownerId" varchar(15) NOT NULL,
	"region" text NOT NULL,
	"endpoint" text,
	"bucketName" text NOT NULL,
	"accessKeyId" text NOT NULL,
	"secretAccessKey" text NOT NULL,
	"provider" text DEFAULT 'aws' NOT NULL,
	CONSTRAINT "s3_buckets_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"sessionToken" varchar(255) NOT NULL,
	"userId" varchar(15) NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_id_unique" UNIQUE("id"),
	CONSTRAINT "sessions_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "shared_videos" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"videoId" varchar(15) NOT NULL,
	"organizationId" varchar(15) NOT NULL,
	"sharedByUserId" varchar(15) NOT NULL,
	"sharedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_videos_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"spaceId" varchar(15) NOT NULL,
	"userId" varchar(15) NOT NULL,
	"role" varchar(255) DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "space_members_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "space_videos" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"spaceId" varchar(15) NOT NULL,
	"folderId" varchar(15),
	"videoId" varchar(15) NOT NULL,
	"addedById" varchar(15) NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "space_videos_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	"name" varchar(255) NOT NULL,
	"organizationId" varchar(15) NOT NULL,
	"createdById" varchar(15) NOT NULL,
	"iconUrl" varchar(255),
	"description" varchar(1000),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"privacy" varchar(255) DEFAULT 'Private' NOT NULL,
	CONSTRAINT "spaces_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"lastName" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp,
	"image" varchar(255),
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"thirdPartyStripeSubscriptionId" varchar(255),
	"stripeSubscriptionStatus" varchar(255),
	"stripeSubscriptionPriceId" varchar(255),
	"preferences" jsonb DEFAULT 'null'::jsonb,
	"activeOrganizationId" varchar(15),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"onboarding_completed_at" timestamp,
	"customBucket" varchar(15),
	"inviteQuota" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "users_id_unique" UNIQUE("id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" varchar(15) PRIMARY KEY NOT NULL,
	"ownerId" varchar(15) NOT NULL,
	"name" varchar(255) DEFAULT 'My Video' NOT NULL,
	"bucket" varchar(15),
	"metadata" jsonb,
	"public" boolean DEFAULT true NOT NULL,
	"transcriptionStatus" varchar(255),
	"source" jsonb DEFAULT '{"type":"MediaConvert"}'::jsonb NOT NULL,
	"folderId" varchar(15),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"password" text,
	"xStreamInfo" text,
	"isScreenshot" boolean DEFAULT false NOT NULL,
	"awsRegion" varchar(255),
	"awsBucket" varchar(255),
	"videoStartTime" varchar(255),
	"audioStartTime" varchar(255),
	"jobId" varchar(255),
	"jobStatus" varchar(255),
	"skipProcessing" boolean DEFAULT false NOT NULL,
	CONSTRAINT "videos_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "accounts_provider_account_id_idx" ON "accounts" USING btree ("providerAccountId");--> statement-breakpoint
CREATE INDEX "comments_video_id_idx" ON "comments" USING btree ("videoId");--> statement-breakpoint
CREATE INDEX "comments_author_id_idx" ON "comments" USING btree ("authorId");--> statement-breakpoint
CREATE INDEX "comments_parent_comment_id_idx" ON "comments" USING btree ("parentCommentId");--> statement-breakpoint
CREATE INDEX "folders_organization_id_idx" ON "folders" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "folders_created_by_id_idx" ON "folders" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "folders_parent_id_idx" ON "folders" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "folders_space_id_idx" ON "folders" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "recipient_id_idx" ON "notifications" USING btree ("recipientId");--> statement-breakpoint
CREATE INDEX "org_id_idx" ON "notifications" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "read_at_idx" ON "notifications" USING btree ("readAt");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "notifications" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "recipient_read_idx" ON "notifications" USING btree ("recipientId","readAt");--> statement-breakpoint
CREATE INDEX "recipient_created_idx" ON "notifications" USING btree ("recipientId","createdAt");--> statement-breakpoint
CREATE INDEX "org_invites_organization_id_idx" ON "organization_invites" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "org_invites_invited_email_idx" ON "organization_invites" USING btree ("invitedEmail");--> statement-breakpoint
CREATE INDEX "org_invites_invited_by_user_id_idx" ON "organization_invites" USING btree ("invitedByUserId");--> statement-breakpoint
CREATE INDEX "org_invites_status_idx" ON "organization_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "organization_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "org_members_organization_id_idx" ON "organization_members" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "org_members_user_id_organization_id_idx" ON "organization_members" USING btree ("userId","organizationId");--> statement-breakpoint
CREATE INDEX "owner_id_idx" ON "organizations" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "custom_domain_idx" ON "organizations" USING btree ("customDomain");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_session_token_idx" ON "sessions" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "shared_videos_video_id_idx" ON "shared_videos" USING btree ("videoId");--> statement-breakpoint
CREATE INDEX "shared_videos_organization_id_idx" ON "shared_videos" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "shared_videos_shared_by_user_id_idx" ON "shared_videos" USING btree ("sharedByUserId");--> statement-breakpoint
CREATE INDEX "shared_videos_video_id_organization_id_idx" ON "shared_videos" USING btree ("videoId","organizationId");--> statement-breakpoint
CREATE INDEX "space_members_space_id_idx" ON "space_members" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "space_members_user_id_idx" ON "space_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "space_members_space_id_user_id_idx" ON "space_members" USING btree ("spaceId","userId");--> statement-breakpoint
CREATE INDEX "space_videos_space_id_idx" ON "space_videos" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "space_videos_folder_id_idx" ON "space_videos" USING btree ("folderId");--> statement-breakpoint
CREATE INDEX "space_videos_video_id_idx" ON "space_videos" USING btree ("videoId");--> statement-breakpoint
CREATE INDEX "space_videos_added_by_id_idx" ON "space_videos" USING btree ("addedById");--> statement-breakpoint
CREATE INDEX "space_videos_space_id_video_id_idx" ON "space_videos" USING btree ("spaceId","videoId");--> statement-breakpoint
CREATE INDEX "spaces_organization_id_idx" ON "spaces" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "spaces_created_by_id_idx" ON "spaces" USING btree ("createdById");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "videos_id_idx" ON "videos" USING btree ("id");--> statement-breakpoint
CREATE INDEX "videos_owner_id_idx" ON "videos" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "videos_is_public_idx" ON "videos" USING btree ("public");--> statement-breakpoint
CREATE INDEX "videos_folder_id_idx" ON "videos" USING btree ("folderId");