import * as Db from "@cap/database/schema";
import { CurrentUser, HttpAuthMiddleware } from "@cap/web-domain";
import { HttpApiError, type HttpApp } from "@effect/platform";
import * as Dz from "drizzle-orm";
import { Effect, Layer, Option } from "effect";

import { Database } from "./Database";

export const getCurrentUser = Effect.gen(function* () {
	// TODO: Implement proper Clerk integration
	return Effect.succeed(Option.none());
}).pipe(Effect.withSpan("getCurrentUser"));

export const HttpAuthMiddlewareLive = Layer.effect(
	HttpAuthMiddleware,
	Effect.gen(function* () {
		return HttpAuthMiddleware.of(
			Effect.fail(new HttpApiError.Unauthorized())
		);
	}),
);

export const provideOptionalAuth = <E, R>(
	app: HttpApp.Default<E, R>,
): HttpApp.Default<
	E | HttpApiError.Unauthorized | HttpApiError.InternalServerError,
	R | Database
> => app;
