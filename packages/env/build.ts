import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const NODE_ENV = process.env.NODE_ENV || "";

// Environment variables that are needed in the build process, and may be incorrect on the client.
// Some are only provided by `NEXT_PUBLIC`, but others can be provdied at runtime
export const buildEnv = createEnv({
	client: {
		NEXT_PUBLIC_IS_CAP: z.string().optional(),
		NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
		NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
		NEXT_PUBLIC_WEB_URL: z.string(),
		// Supabase Configuration
		NEXT_PUBLIC_SUPABASE_URL: z.string(),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
		// Supabase Storage Configuration
		NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().optional(),
		// Clerk Configuration
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
		NEXT_PUBLIC_DOCKER_BUILD: z.string().optional(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_IS_CAP: process.env.NEXT_PUBLIC_IS_CAP,
		NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		NEXT_PUBLIC_WEB_URL: process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		NEXT_PUBLIC_DOCKER_BUILD: process.env.NEXT_PUBLIC_DOCKER_BUILD,
	},
});
