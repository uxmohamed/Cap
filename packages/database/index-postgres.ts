import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema-postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not set");
}

// For Supabase, we can directly use the postgres connection string
const client = postgres(connectionString, {
	prepare: false,
});

export const db = drizzle(client, { schema });

export * from "./schema-postgres";

