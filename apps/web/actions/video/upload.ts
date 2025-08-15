"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { createSignedUpload } from "@/utils/storage";

interface GetVideoUploadPresignedUrlParams {
	fileKey: string;
	duration?: string;
	resolution?: string;
	videoCodec?: string;
	audioCodec?: string;
}

async function getVideoUploadPresignedUrl({
	fileKey,
	duration,
	resolution,
	videoCodec,
	audioCodec,
}: GetVideoUploadPresignedUrlParams) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	try {
		// Supabase signed upload only
		const signed = await createSignedUpload(fileKey);

		const contentType = fileKey.endsWith(".aac")
			? "audio/aac"
			: fileKey.endsWith(".webm")
				? "audio/webm"
				: fileKey.endsWith(".mp4")
					? "video/mp4"
					: fileKey.endsWith(".mp3")
						? "audio/mpeg"
						: fileKey.endsWith(".m3u8")
							? "application/x-mpegURL"
							: "video/mp2t";

		// Return Supabase signed upload data
		return {
			url: signed.signedUrl,
			fields: {
				token: signed.token,
				"Content-Type": contentType,
				"x-amz-meta-userid": user.id,
				"x-amz-meta-duration": duration ?? "",
				"x-amz-meta-resolution": resolution ?? "",
				"x-amz-meta-videocodec": videoCodec ?? "",
				"x-amz-meta-audiocodec": audioCodec ?? "",
			},
		};
	} catch (error) {
		console.error("Error getting presigned URL:", error);
		throw new Error(
			error instanceof Error ? error.message : "Failed to get presigned URL",
		);
	}
}

export async function createVideoAndGetUploadUrl({
	videoId,
	fileKey,
	duration,
	resolution,
	videoCodec,
	audioCodec,
}: {
	videoId: string;
	fileKey: string;
	duration?: string;
	resolution?: string;
	videoCodec?: string;
	audioCodec?: string;
}) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	// Check if video exists and belongs to user
	const existingVideo = await db()
		.select()
		.from(videos)
		.where(eq(videos.id, videoId))
		.limit(1);

	if (existingVideo.length > 0) {
		const video = existingVideo[0];
		if (video.ownerId !== user.id) {
			throw new Error("You don't have permission to upload to this video");
		}

		// Get Supabase signed upload URL
		const signed = await createSignedUpload(fileKey);

		return {
			id: existingVideo.id,
			presignedPostData: { url: signed.signedUrl, fields: { token: signed.token } },
		};
	}

	// Create new video
	const newVideo = await db()
		.insert(videos)
		.values({
			id: videoId,
			name: `Video ${videoId}`,
			ownerId: user.id,
			awsRegion: "auto",
			awsBucket: "capso-videos",
			bucket: null, // No longer using S3 buckets
			public: serverEnv().CAP_VIDEOS_DEFAULT_PUBLIC,
			metadata: {
				duration: duration ? parseFloat(duration) : undefined,
			},
		})
		.returning();

	if (newVideo.length === 0) {
		throw new Error("Failed to create video");
	}

	// Get Supabase signed upload URL
	const signed = await createSignedUpload(fileKey);

	return {
		id: newVideo[0].id,
		presignedPostData: { url: signed.signedUrl, fields: { token: signed.token } },
	};
}
