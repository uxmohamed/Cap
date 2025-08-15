import { CurrentUser, Policy, Video } from "@cap/web-domain";
import { Array, Effect, Option } from "effect";
import { VideosPolicy } from "./VideosPolicy";
import { VideosRepo } from "./VideosRepo";

export class Videos extends Effect.Service<Videos>()("Videos", {
	effect: Effect.gen(function* () {
		const repo = yield* VideosRepo;
		const policy = yield* VideosPolicy;

		return {
			/*
			 * Get a video by ID. Will fail if the user does not have access.
			 */
			// This is only for external use since it does an access check,
			// internal use should prefer the repo directly
			getById: (id: Video.VideoId) =>
				repo.getById(id).pipe(
					Policy.withPublicPolicy(policy.canView(id)),
					Effect.withSpan("Videos.getById"),
				),

			/*
			 * Delete a video. Will fail if the user does not have access.
			 */
			delete: Effect.fn("Videos.delete")(function* (videoId: Video.VideoId) {
				// TODO: Implement Supabase Storage deletion
				yield* repo
					.delete(videoId)
					.pipe(Policy.withPolicy(policy.isOwner(videoId)));
			}),

			/*
			 * Duplicates a video, its metadata, and its media files.
			 * Comments and reactions will not be duplicated or carried over.
			 */
			duplicate: Effect.fn("Videos.duplicate")(function* (
				videoId: Video.VideoId,
			) {
				const [video] = yield* repo
					.getById(videoId)
					.pipe(
						Effect.flatMap(Effect.catchAll(() => new Video.NotFoundError())),
						Policy.withPolicy(policy.isOwner(videoId)),
					);

				// TODO: Implement Supabase Storage duplication
				const newVideoId = yield* repo.create(yield* video.toJS());
				
				return newVideoId;
			}),
		};
	}),
	dependencies: [VideosPolicy.Default, VideosRepo.Default],
}) { }
