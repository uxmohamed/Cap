import { serverEnv } from "@cap/env";
import {
	provideOptionalAuth,
	Videos,
} from "@cap/web-backend";
import { Video } from "@cap/web-domain";
import {
	HttpApi,
	HttpApiBuilder,
	HttpApiEndpoint,
	HttpApiError,
	HttpApiGroup,
	HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer, Option, Schema } from "effect";
import { apiToHandler } from "@/lib/server";
import { CACHE_CONTROL_HEADERS } from "@/utils/helpers";
import {
	generateM3U8Playlist,
	generateMasterPlaylist,
} from "@/utils/video/ffmpeg/helpers";

export const revalidate = "force-dynamic";

const GetPlaylistParams = Schema.Struct({
	videoId: Video.VideoId,
	videoType: Schema.Literal("video", "audio", "master", "mp4"),
	thumbnail: Schema.OptionFromUndefinedOr(Schema.String),
	fileType: Schema.OptionFromUndefinedOr(Schema.String),
});

class Api extends HttpApi.make("CapWebApi").add(
	HttpApiGroup.make("root").add(
		HttpApiEndpoint.get("getVideoSrc")`/api/playlist`
			.setUrlParams(GetPlaylistParams)
			.addError(HttpApiError.Forbidden)
			.addError(HttpApiError.BadRequest)
			.addError(HttpApiError.Unauthorized)
			.addError(HttpApiError.InternalServerError)
			.addError(HttpApiError.NotFound),
	),
) { }

const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(
		HttpApiBuilder.group(Api, "root", (handlers) =>
			Effect.gen(function* () {
				const videos = yield* Videos;

				return handlers.handle("getVideoSrc", ({ urlParams }) =>
					Effect.gen(function* () {
						const [video] = yield* videos.getById(urlParams.videoId).pipe(
							Effect.flatten,
							Effect.catchTag(
								"NoSuchElementException",
								() => new HttpApiError.NotFound(),
							),
						);

						// TODO: Implement Supabase Storage functionality
						return new HttpApiError.InternalServerError("S3 functionality not yet migrated to Supabase");
					}).pipe(
						provideOptionalAuth,
						Effect.tapErrorCause(Effect.logError),
						Effect.catchTags({
							VerifyVideoPasswordError: () => new HttpApiError.Forbidden(),
							PolicyDenied: () => new HttpApiError.Unauthorized(),
							DatabaseError: () => new HttpApiError.InternalServerError(),
							UnknownException: () => new HttpApiError.InternalServerError(),
						}),
					),
				);
			}),
		),
	),
);

const { handler } = apiToHandler(ApiLive);

export const GET = handler;
export const HEAD = handler;
