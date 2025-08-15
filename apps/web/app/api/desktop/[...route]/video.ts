import { db } from "@cap/database";
import { s3Buckets, videos } from "@cap/database/schema";
import { buildEnv, serverEnv } from "@cap/env";
import { dub } from "@cap/utils";
import { count, eq, and } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { withAuth } from "@/app/api/utils";
import { nanoId } from "@cap/utils";
import { sendEmail } from "@cap/utils";
import { FirstShareableLink } from "@cap/utils";
import { createClient } from "@supabase/supabase-js";

export const app = new Hono().use(withAuth);

app.post(
	"/create",
	zValidator(
		"json",
		z.object({
			name: z.string().optional(),
			videoId: z.string().optional(),
			recordingMode: z.enum(["hls", "desktopMP4"]).optional(),
			isScreenshot: z.boolean().optional(),
			duration: z.number().optional(),
		}),
	),
	async (c) => {
		const { name, videoId, recordingMode, isScreenshot, duration } =
			c.req.valid("json");
		const user = c.get("user");

		try {
			const supabase = createClient(
				serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
				serverEnv().SUPABASE_SERVICE_ROLE!
			);

			const date = new Date();
			const formattedDate = `${date.getDate()} ${date.toLocaleString(
				"default",
				{ month: "long" },
			)} ${date.getFullYear()}`;

			if (videoId !== undefined) {
				const [video] = await db()
					.select()
					.from(videos)
					.where(eq(videos.id, videoId));

				if (video) {
					return c.json({
						id: video.id,
						// All deprecated
						user_id: user.id,
						aws_region: "n/a",
						aws_bucket: "n/a",
					});
				}
			}

			const idToUse = nanoId();

			const videoName =
				name ??
				`Cap ${isScreenshot ? "Screenshot" : "Recording"} - ${formattedDate}`;

			await db()
				.insert(videos)
				.values({
					id: idToUse,
					name: videoName,
					ownerId: user.id,
					awsRegion: "auto",
					awsBucket: "capso-videos",
					source:
						recordingMode === "hls"
							? { type: "local" as const }
							: recordingMode === "desktopMP4"
								? { type: "desktopMP4" as const }
								: undefined,
					isScreenshot,
					bucket: null, // No longer using S3 buckets
					public: serverEnv().CAP_VIDEOS_DEFAULT_PUBLIC,
					metadata: {
						duration,
					},
				});

			if (buildEnv.NEXT_PUBLIC_IS_CAP && NODE_ENV === "production")
				await dub().links.create({
					url: `${serverEnv().WEB_URL}/s/${idToUse}`,
					domain: "cap.link",
					key: idToUse,
				});

			try {
				const videoCount = await db()
					.select({ count: count() })
					.from(videos)
					.where(eq(videos.ownerId, user.id));

				if (
					videoCount &&
					videoCount[0] &&
					videoCount[0].count === 1 &&
					user.email
				) {
					console.log(
						"[SendFirstShareableLinkEmail] Sending first shareable link email with 5-minute delay",
					);

					const videoUrl = buildEnv.NEXT_PUBLIC_IS_CAP
						? `https://cap.link/${idToUse}`
						: `${serverEnv().WEB_URL}/s/${idToUse}`;

					await sendEmail({
						email: user.email,
						subject: "You created your first Cap! 🥳",
						react: FirstShareableLink({
							email: user.email,
							url: videoUrl,
							videoName: videoName,
						}),
						marketing: true,
						scheduledAt: "in 5 min",
					});

					console.log(
						"[SendFirstShareableLinkEmail] First shareable link email scheduled to be sent in 5 minutes",
					);
				}
			} catch (error) {
				console.error(
					"Error checking for first video or sending email:",
					error,
				);
			}

			return c.json({
				id: idToUse,
				// All deprecated
				user_id: user.id,
				aws_region: "n/a",
				aws_bucket: "n/a",
			});
		} catch (error) {
			console.error("Error in video create endpoint:", error);
			return c.json({ error: "Internal server error" }, { status: 500 });
		}
	},
);

app.delete(
	"/delete",
	zValidator("query", z.object({ videoId: z.string() })),
	async (c) => {
		const { videoId } = c.req.valid("query");
		const user = c.get("user");

		try {
			const [video] = await db()
				.select()
				.from(videos)
				.where(eq(videos.id, videoId));

			if (!video)
				return c.json(
					{ error: true, message: "Video not found" },
					{ status: 404 },
				);

			await db()
				.delete(videos)
				.where(and(eq(videos.id, videoId), eq(videos.ownerId, user.id)));

			// Delete video files from Supabase Storage
			const supabase = createClient(
				serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
				serverEnv().SUPABASE_SERVICE_ROLE!
			);

			try {
				const { data: objects, error } = await supabase.storage
					.from("capso-videos")
					.list(`${user.id}/${videoId}/`);

				if (error) {
					console.error("Error listing video objects:", error);
				} else if (objects && objects.length > 0) {
					const objectPaths = objects.map(obj => `${user.id}/${videoId}/${obj.name}`);
					
					const { error: deleteError } = await supabase.storage
						.from("capso-videos")
						.remove(objectPaths);

					if (deleteError) {
						console.error("Error deleting video objects:", deleteError);
					}
				}
			} catch (storageError) {
				console.error("Error deleting video from storage:", storageError);
			}

			return c.json(true);
		} catch (error) {
			console.error("Error in video delete endpoint:", error);
			return c.json({ error: "Internal server error" }, { status: 500 });
		}
	},
);
