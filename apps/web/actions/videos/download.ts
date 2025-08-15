"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { videos } from "@cap/database/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@cap/env";

export async function downloadVideo(videoId: string) {
	const user = await getCurrentUser();

	if (!user || !videoId) {
		throw new Error("Missing required data for downloading video");
	}

	const userId = user.id;
	const query = await db().select().from(videos).where(eq(videos.id, videoId));

	if (query.length === 0) {
		throw new Error("Video not found");
	}

	const video = query[0];
	if (!video) {
		throw new Error("Video not found");
	}

	if (video.ownerId !== userId) {
		throw new Error("You don't have permission to download this video");
	}

	try {
		const supabase = createClient(
			serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
			serverEnv().SUPABASE_SERVICE_ROLE!
		);

		const videoKey = `${video.ownerId}/${videoId}/result.mp4`;
		const { data, error } = await supabase.storage
			.from("capso-videos")
			.createSignedUrl(videoKey, 3600); // 1 hour expiry

		if (error) {
			throw new Error(`Failed to generate download URL: ${error.message}`);
		}

		return {
			success: true,
			downloadUrl: data.signedUrl,
			filename: `${video.name}.mp4`,
		};
	} catch (error) {
		console.error("Error generating download URL:", error);
		if (error instanceof Error) {
			throw new Error(error.message);
		}
		throw new Error("Failed to generate download URL");
	}
}
