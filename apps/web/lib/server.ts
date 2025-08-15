import "server-only";

import { db } from "@cap/database";
import type { HttpAuthMiddleware } from "@cap/web-domain";
import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import {
	type HttpApi,
	HttpApiBuilder,
	HttpMiddleware,
	HttpServer,
} from "@effect/platform";
import { Effect, Layer } from "effect";
import { allowedOrigins } from "@/utils/cors";
import { getTracingConfig } from "./tracing";

// Placeholder implementations
const Database = {
	Default: {},
	execute: () => Promise.resolve(null)
};

const DatabaseError = class extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DatabaseError';
	}
};

const Folders = {
	Default: {},
	delete: () => Promise.resolve(null)
};

const Videos = {
	Default: {},
	getById: () => Promise.resolve(null),
	delete: () => Promise.resolve(null),
	duplicate: () => Promise.resolve(null)
};

const HttpAuthMiddlewareLive = {};

const DatabaseLive = Layer.sync(Database, () => ({
	execute: (cb) =>
		Effect.tryPromise({
			try: () => cb(db()),
			catch: (error) => new DatabaseError(String(error)),
		}),
}));

const TracingLayer = NodeSdk.layer(getTracingConfig);

export const Dependencies = Layer.mergeAll(
	Videos.Default,
	Folders.Default,
	TracingLayer,
).pipe(Layer.provideMerge(DatabaseLive));

const cors = HttpApiBuilder.middlewareCors({
	allowedOrigins,
	credentials: true,
	allowedMethods: ["GET", "HEAD", "POST", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "sentry-trace", "baggage"],
});

export const apiToHandler = (
	api: Layer.Layer<
		HttpApi.Api,
		never,
		Layer.Layer.Success<typeof Dependencies> | HttpAuthMiddleware
	>,
) =>
	api.pipe(
		HttpMiddleware.withSpanNameGenerator((req) => `${req.method} ${req.url}`),
		Layer.provideMerge(HttpAuthMiddlewareLive),
		Layer.provideMerge(Dependencies),
		Layer.merge(HttpServer.layerContext),
		Layer.provide(cors),
		HttpApiBuilder.toWebHandler,
	);
