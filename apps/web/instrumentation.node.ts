// This file is used to run database migrations in the docker builds or other self hosting environments.
// It is not suitable (a.k.a DEADLY) for serverless environments where the server will be restarted on each request.
//

import { db } from "@cap/database";
import { buildEnv } from "@cap/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";

export async function register() {
	console.log("Waiting 5 seconds to run migrations");

	// Function to trigger migrations with retry logic
	const triggerMigrations = async (retryCount = 0, maxRetries = 3) => {
		try {
			await runMigrations();
		} catch (error) {
			console.error(
				`🚨 Error triggering migrations (attempt ${retryCount + 1}):`,
				error,
			);
			if (retryCount < maxRetries - 1) {
				console.log(
					`🔄 Retrying in 5 seconds... (${retryCount + 1}/${maxRetries})`,
				);
				setTimeout(() => triggerMigrations(retryCount + 1, maxRetries), 5000);
			} else {
				console.error(`🚨 All ${maxRetries} migration attempts failed.`);
				process.exit(1); // Exit with error code if all attempts fail
			}
		}
	};

	// Add a timeout to trigger migrations after 5 seconds on server start
	setTimeout(() => triggerMigrations(), 5000);

	// S3 bucket creation removed - using Supabase Storage now
	console.log("Using Supabase Storage - no S3 bucket creation needed");
}

async function runMigrations() {
	const isDockerBuild = buildEnv.NEXT_PUBLIC_DOCKER_BUILD === "true";
	if (isDockerBuild) {
		try {
			console.log("🔍 DB migrations triggered");
			console.log("💿 Running DB migrations...");

			await migrate(db() as any, {
				migrationsFolder: path.join(process.cwd(), "/migrations-postgres"),
			});
			console.log("💿 Migrations run successfully!");
		} catch (error) {
			console.error("💿 Error running migrations:", error);
			throw error;
		}
	} else {
		console.log("🔍 Skipping DB migrations (not a docker build)");
	}
}
