import type { Config } from "drizzle-kit";

const URL = process.env.DATABASE_URL;

if (!URL)
	throw new Error("DATABASE_URL must be set!");

// For Supabase, we expect a postgres:// URL
if (!URL?.startsWith("postgres://") && !URL?.startsWith("postgresql://"))
	throw new Error(
		"DATABASE_URL must be a 'postgres://' or 'postgresql://' URI for Supabase!",
	);

export default {
	schema: "./schema-postgres.ts",
	out: "./migrations-postgres",
	dialect: "postgresql",
	dbCredentials: { url: URL },
	casing: "snake_case",
} satisfies Config;

