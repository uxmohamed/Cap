"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { videos } from "@cap/database/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@cap/env";

export async function getTranscript(
	videoId: string,
): Promise<{ success: boolean; content?: string; message: string }> {
	const user = await getCurrentUser();

	if (!videoId) {
		return {
			success: false,
			message: "Missing required data for fetching transcript",
		};
	}

	const query = await db()
		.select()
		.from(videos)
		.where(eq(videos.id, videoId));

	if (query.length === 0) {
		return { success: false, message: "Video not found" };
	}

	const video = query[0];
	if (!video) {
		return { success: false, message: "Video information is missing" };
	}

	if (video.transcriptionStatus !== "COMPLETE") {
		return {
			success: false,
			message: "Transcript is not ready yet",
		};
	}

	const supabase = createClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	try {
		const transcriptKey = `${video.ownerId}/${videoId}/transcription.vtt`;

		const { data, error } = await supabase.storage
			.from("capso-videos")
			.download(transcriptKey);

		if (error) {
			console.error("[getTranscript] Supabase error:", error);
			return { success: false, message: "Transcript file not found" };
		}

		const vttContent = await data.text();

		return {
			success: true,
			content: vttContent,
			message: "Transcript retrieved successfully",
		};
	} catch (error) {
		console.error("[getTranscript] Error fetching transcript:", {
			error: error instanceof Error ? error.message : error,
			videoId,
			userId: user?.id,
		});
		return {
			success: false,
			message: "Failed to fetch transcript",
		};
	}
}
