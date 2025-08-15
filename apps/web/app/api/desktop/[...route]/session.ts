import { db } from "@cap/database";

import { getCurrentUser } from "@cap/database/auth/session";
import { authApiKeys } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

export const app = new Hono();

app.get(
	"/request",
	zValidator(
		"query",
		z.object({
			port: z.string().optional(),
			platform: z
				.union([z.literal("web"), z.literal("desktop")])
				.default("web"),
			type: z
				.union([z.literal("session"), z.literal("api_key")])
				.default("session"),
		}),
	),
	async (c) => {
		const { port, platform, type } = c.req.valid("query");

		const url = new URL(c.req.url);

		const redirectOrigin = getDeploymentOrigin();

		const loginRedirectUrl = new URL(`${redirectOrigin}/login`);
		loginRedirectUrl.searchParams.set(
			"next",
			new URL(`${redirectOrigin}${url.pathname}${url.search}`).toString(),
		);

		const user = await getCurrentUser();
		if (!user) return c.redirect(loginRedirectUrl);

		let data;

		if (type === "session") {
			// For Clerk, we'll use the session token from the request
			const { userId } = await auth();
			if (!userId) return c.redirect(loginRedirectUrl);

			data = {
				type: "token",
				token: "clerk-session", // Placeholder - Clerk handles session management
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
			};
		} else {
			const id = crypto.randomUUID();
			await db().insert(authApiKeys).values({ id, userId: user.id });

			data = { type: "api_key", api_key: id };
		}

		const params = new URLSearchParams({ ...data, user_id: user.id });

		const returnUrl = new URL(
			platform === "web"
				? `http://127.0.0.1:${port}?${params}`
				: `cap-desktop://signin?${params}`,
		);

		return Response.redirect(returnUrl.href);
	},
);

function getDeploymentOrigin() {
	const vercelEnv = serverEnv().VERCEL_ENV;
	if (!vercelEnv) return serverEnv().WEB_URL;

	const vercelHosts = {
		prod: serverEnv().VERCEL_PROJECT_PRODUCTION_URL_HOST,
		branch: serverEnv().VERCEL_BRANCH_URL_HOST,
	};

	if (vercelEnv === "production" && vercelHosts.prod)
		return `https://${vercelHosts.prod}`;

	if (vercelEnv === "preview" && vercelHosts.branch)
		return `https://${vercelHosts.branch}`;

	return serverEnv().WEB_URL;
}
