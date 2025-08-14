import { db } from "@cap/database";
import { s3Buckets, videos } from "@cap/database/schema";
import type { VideoMetadata } from "@cap/database/types";
import { serverEnv } from "@cap/env";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { withAuth } from "@/app/api/utils";
import { createSignedUpload } from "@/utils/storage";
import { parseVideoIdOrFileKey } from "../utils";

export const app = new Hono().use(withAuth);

app.post(
	"/initiate",
	zValidator(
		"json",
		z.object({ contentType: z.string() }).and(
			z.union([
				z.object({ videoId: z.string() }),
				// deprecated
				z.object({ fileKey: z.string() }),
			]),
		),
	),
	async (c) => {
		const { contentType, ...body } = c.req.valid("json");
		const user = c.get("user");

		const fileKey = parseVideoIdOrFileKey(user.id, {
			...body,
			subpath: "result.mp4",
		});

		try {
			try {
                // Supabase: return synthetic uploadId (the key). Client should PUT using signed URL.
                const finalContentType = contentType || "video/mp4";
                const signed = await createSignedUpload(fileKey);
                return c.json({ uploadId: fileKey, signedUrl: signed.signedUrl, token: signed.token, contentType: finalContentType });
			} catch (s3Error) {
				console.error("S3 operation failed:", s3Error);
				throw new Error(
					`S3 operation failed: ${
						s3Error instanceof Error ? s3Error.message : "Unknown error"
					}`,
				);
			}
		} catch (error) {
			console.error("Error initiating multipart upload", error);
			return c.json(
				{
					error: "Error initiating multipart upload",
					details: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	},
);

app.post(
	"/presign-part",
	zValidator(
		"json",
		z
			.object({
				uploadId: z.string(),
				partNumber: z.number(),
				md5Sum: z.string(),
			})
			.and(
				z.union([
					z.object({ videoId: z.string() }),
					// deprecated
					z.object({ fileKey: z.string() }),
				]),
			),
	),
	async (c) => {
		const { uploadId, partNumber, md5Sum, ...body } = c.req.valid("json");
		const user = c.get("user");

		const fileKey = parseVideoIdOrFileKey(user.id, {
			...body,
			subpath: "result.mp4",
		});

		try {
			try {
                // For Supabase single PUT flow, always return signed upload URL for whole file
                const signed = await createSignedUpload(fileKey);
                return c.json({ presignedUrl: signed.signedUrl, token: signed.token });
			} catch (s3Error) {
				console.error("S3 operation failed:", s3Error);
				throw new Error(
					`S3 operation failed: ${
						s3Error instanceof Error ? s3Error.message : "Unknown error"
					}`,
				);
			}
		} catch (error) {
			console.error("Error creating presigned URL for part", error);
			return c.json(
				{
					error: "Error creating presigned URL for part",
					details: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	},
);

app.post(
	"/complete",
	zValidator(
		"json",
		z
			.object({
				uploadId: z.string(),
				parts: z.array(
					z.object({
						partNumber: z.number(),
						etag: z.string(),
						size: z.number(),
					}),
				),
				duration: z.string().optional(),
				bandwidth: z.string().optional(),
				resolution: z.string().optional(),
				videoCodec: z.string().optional(),
				audioCodec: z.string().optional(),
				framerate: z.string().optional(),
			})
			.and(
				z.union([
					z.object({ videoId: z.string() }),
					// deprecated
					z.object({ fileKey: z.string() }),
				]),
			),
	),
	async (c) => {
		const { uploadId, parts, ...body } = c.req.valid("json");
		const user = c.get("user");

		const fileKey = parseVideoIdOrFileKey(user.id, {
			...body,
			subpath: "result.mp4",
		});

		try {
			try {
                // Supabase: nothing to complete server-side. Consider object already uploaded.
                const result = { Location: fileKey } as any;

				try {
					console.log(
						`Multipart upload completed successfully: ${
							result.Location || "no location"
						}`,
					);
					console.log(`Complete response: ${JSON.stringify(result, null, 2)}`);

					try {
						console.log(
							"Performing metadata fix by copying the object to itself...",
						);

						const copyResult = await bucket.copyObject(
							`${bucket.name}/${fileKey}`,
							fileKey,
							{
								ContentType: "video/mp4",
								MetadataDirective: "REPLACE",
							},
						);

						console.log("Copy for metadata fix successful:", copyResult);
					} catch (copyError) {
						console.error(
							"Warning: Failed to copy object to fix metadata:",
							copyError,
						);
					}

					try {
						const headResult = await bucket.headObject(fileKey);
						console.log(
							`Object verification successful: ContentType=${headResult.ContentType}, ContentLength=${headResult.ContentLength}`,
						);
					} catch (headError) {
						console.error(`Warning: Unable to verify object: ${headError}`);
					}

					const videoMetadata: VideoMetadata = {
						duration: body.duration,
						bandwidth: body.bandwidth,
						resolution: body.resolution,
						videoCodec: body.videoCodec,
						audioCodec: body.audioCodec,
						framerate: body.framerate,
					};

					if (Object.values(videoMetadata).length > 1 && "videoId" in body)
						await db()
							.update(videos)
							.set({
								metadata: videoMetadata,
							})
							.where(eq(videos.id, body.videoId));

                    const videoIdFromFileKey = fileKey.split("/")[1];
					if (videoIdFromFileKey) {
						try {
							await fetch(`${serverEnv().WEB_URL}/api/revalidate`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({ videoId: videoIdFromFileKey }),
							});
							console.log(
								`Revalidation triggered for videoId: ${videoIdFromFileKey}`,
							);
						} catch (revalidateError) {
							console.error("Failed to revalidate page:", revalidateError);
						}
					}

					return c.json({
						location: result.Location,
						success: true,
						fileKey,
					});
				} catch (completeError) {
					console.error("Failed to complete multipart upload:", completeError);
					return c.json(
						{
							error: "Failed to complete multipart upload",
							details:
								completeError instanceof Error
									? completeError.message
									: String(completeError),
							uploadId,
							fileKey,
							parts: formattedParts.length,
						},
						500,
					);
				}
			} catch (s3Error) {
				console.error("S3 operation failed:", s3Error);
				throw new Error(
					`S3 operation failed: ${
						s3Error instanceof Error ? s3Error.message : "Unknown error"
					}`,
				);
			}
		} catch (error) {
			console.error("Error completing multipart upload", error);
			return c.json(
				{
					error: "Error completing multipart upload",
					details: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	},
);

async function getUserBucketWithClient(userId: string) {
	const [customBucket] = await db()
		.select()
		.from(s3Buckets)
		.where(eq(s3Buckets.ownerId, userId));

	console.log("S3 bucket configuration:", {
		hasEndpoint: !!customBucket?.endpoint,
		endpoint: customBucket?.endpoint || "N/A",
		region: customBucket?.region || "N/A",
		hasAccessKey: !!customBucket?.accessKeyId,
		hasSecretKey: !!customBucket?.secretAccessKey,
	});

	const bucket = await createBucketProvider(customBucket);

	return { bucket };
}
