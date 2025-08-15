import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { authApiKeys, users } from "@cap/database/schema";
import { buildEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { auth } from "@clerk/nextjs/server";

async function getAuth(c: Context) {
	const authHeader = c.req.header("authorization")?.split(" ")[1];

	let user;

	if (authHeader?.length === 36) {
		const res = await db()
			.select()
			.from(users)
			.leftJoin(authApiKeys, eq(users.id, authApiKeys.userId))
			.where(eq(authApiKeys.id, authHeader));
		user = res[0]?.users;
	} else {
		// Use Clerk auth instead of NextAuth
		const { userId } = await auth();
		
		if (userId) {
			const [currentUser] = await db()
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			user = currentUser;
		}
	}

	if (!user) return;
	return { user };
}

export const withOptionalAuth = createMiddleware<{
	Variables: {
		user?: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
	};
}>(async (c, next) => {
	const auth = await getAuth(c);

	if (auth) c.set("user", auth.user);

	await next();
});

export const withAuth = createMiddleware<{
	Variables: {
		user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
	};
}>(async (c, next) => {
	const auth = await getAuth(c);
	if (!auth) return c.text("User not authenticated", 401);

	c.set("user", auth.user);

	await next();
});

export const allowedOrigins = [
	buildEnv.NEXT_PUBLIC_WEB_URL,
	buildEnv.NEXT_PUBLIC_WEB_URL.replace("https://", "http://"),
	"http://localhost:3000",
	"http://localhost:3001",
	"http://localhost:3002",
	"http://localhost:3003",
	"http://localhost:3004",
	"http://localhost:3005",
	"http://localhost:3006",
	"http://localhost:3007",
	"http://localhost:3008",
	"http://localhost:3009",
	"http://localhost:3010",
];

export const corsMiddleware = cors({
	origin: allowedOrigins,
	credentials: true,
});
