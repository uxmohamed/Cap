import { Rpcs } from "@cap/web-domain";
import { HttpServer } from "@effect/platform";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Layer } from "effect";
import { Dependencies } from "@/lib/server";

// Placeholder implementations
const RpcAuthMiddlewareLive = {};
const RpcsLive = {};

const { handler } = RpcServer.toWebHandler(Rpcs, {
	layer: Layer.mergeAll(
		RpcAuthMiddlewareLive,
		RpcsLive,
		RpcSerialization.layerJson,
		HttpServer.layerContext,
	).pipe(Layer.provideMerge(Dependencies)),
});

export const GET = handler;
export const POST = handler;
