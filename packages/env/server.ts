import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const boolString = (_default = false) =>
	z
		.string()
		.optional()
		.default(_default ? "true" : "false")
		.transform((v) => v === "true")
		.pipe(z.boolean());

function createServerEnv() {
	return createEnv({
		server: {
			NODE_ENV: z.string(),
			DATABASE_URL: z.string(),
			WEB_URL: z.string(),
			DATABASE_MIGRATION_URL: z.string().optional(),
			DATABASE_ENCRYPTION_KEY: z.string().optional(),
			// Supabase (server-only)
			SUPABASE_SERVICE_ROLE: z.string().optional(),
			// Supabase Storage Configuration
			SUPABASE_STORAGE_BUCKET: z.string().optional(),
			// Clerk Authentication
			CLERK_SECRET_KEY: z.string(),
			CLERK_WEBHOOK_SECRET: z.string().optional(),

			// Optional integrations
			GOOGLE_CLIENT_ID: z.string().optional(),
			GOOGLE_CLIENT_SECRET: z.string().optional(),
			WORKOS_CLIENT_ID: z.string().optional(),
			WORKOS_API_KEY: z.string().optional(),
			DUB_API_KEY: z.string().optional(),
			RESEND_API_KEY: z.string().optional(),
			RESEND_FROM_DOMAIN: z.string().optional(),
			DEEPGRAM_API_KEY: z.string().optional(),
			NEXT_LOOPS_KEY: z.string().optional(),
			STRIPE_SECRET_KEY_TEST: z.string().optional(),
			STRIPE_SECRET_KEY_LIVE: z.string().optional(),
			STRIPE_WEBHOOK_SECRET: z.string().optional(),
			DISCORD_FEEDBACK_WEBHOOK_URL: z.string().optional(),
			OPENAI_API_KEY: z.string().optional(),
			GROQ_API_KEY: z.string().optional(),
			INTERCOM_SECRET: z.string().optional(),
			CAP_VIDEOS_DEFAULT_PUBLIC: boolString(true),
			CAP_ALLOWED_SIGNUP_DOMAINS: z.string().optional(),
			VERCEL_ENV: z
				.union([
					z.literal("production"),
					z.literal("preview"),
					z.literal("development"),
				])
				.optional(),
			VERCEL_TEAM_ID: z.string().optional(),
			VERCEL_PROJECT_ID: z.string().optional(),
			VERCEL_AUTH_TOKEN: z.string().optional(),
			VERCEL_URL_HOST: z.string().optional(),
			VERCEL_BRANCH_URL_HOST: z.string().optional(),
			VERCEL_PROJECT_PRODUCTION_URL_HOST: z.string().optional(),
			DOCKER_BUILD: z.string().optional(),
			POSTHOG_PERSONAL_API_KEY: z.string().optional(),
		},
		experimental__runtimeEnv: {
			...process.env,
			VERCEL_URL_HOST: process.env.VERCEL_URL,
			VERCEL_BRANCH_URL_HOST: process.env.VERCEL_BRANCH_URL,
			VERCEL_PROJECT_PRODUCTION_URL_HOST:
				process.env.VERCEL_PROJECT_PRODUCTION_URL,
		},
	});
}

let _cached: ReturnType<typeof createServerEnv> | undefined;
export const serverEnv = () => {
	if (_cached) return _cached;
	_cached = createServerEnv();
	return _cached;
};
