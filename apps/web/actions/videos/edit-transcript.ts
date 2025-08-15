"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { videos } from "@cap/database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@cap/env";

export async function editTranscriptEntry(
	videoId: string,
	entryId: number,
	newText: string,
): Promise<{ success: boolean; message: string }> {
	const user = await getCurrentUser();

	if (!user || !videoId || entryId === undefined || !newText?.trim()) {
		return {
			success: false,
			message: "Missing required data for updating transcript entry",
		};
	}

	const userId = user.id;
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

	if (video.ownerId !== userId) {
		return {
			success: false,
			message: "You don't have permission to edit this transcript",
		};
	}

	const supabase = createClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	try {
		const transcriptKey = `${video.ownerId}/${videoId}/transcription.vtt`;

		// Download current transcript
		const { data: downloadData, error: downloadError } = await supabase.storage
			.from("capso-videos")
			.download(transcriptKey);

		if (downloadError) {
			console.error("[editTranscript] Download error:", downloadError);
			return { success: false, message: "Transcript file not found" };
		}

		const vttContent = await downloadData.text();
		const updatedVttContent = updateVttEntry(vttContent, entryId, newText);

		// Upload updated transcript
		const { error: uploadError } = await supabase.storage
			.from("capso-videos")
			.upload(transcriptKey, updatedVttContent, {
				contentType: "text/vtt",
				upsert: true,
			});

		if (uploadError) {
			console.error("[editTranscript] Upload error:", uploadError);
			return { success: false, message: "Failed to save transcript changes" };
		}

		revalidatePath(`/s/${videoId}`);

		return {
			success: true,
			message: "Transcript entry updated successfully",
		};
	} catch (error) {
		console.error("Error updating transcript entry:", {
			error: error instanceof Error ? error.message : error,
			videoId,
			entryId,
			userId,
		});
		return {
			success: false,
			message: "Failed to update transcript entry",
		};
	}
}

function updateVttEntry(
	vttContent: string,
	entryId: number,
	newText: string,
): string {
	const lines = vttContent.split("\n");
	const updatedLines: string[] = [];
	let currentEntryId: number | null = null;
	let foundEntry = false;
	let isNextLineText = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] || "";
		const trimmedLine = line.trim();

		if (!trimmedLine) {
			updatedLines.push(line);
			isNextLineText = false;
			continue;
		}

		if (trimmedLine === "WEBVTT") {
			updatedLines.push(line);
			continue;
		}

		if (/^\d+$/.test(trimmedLine)) {
			currentEntryId = parseInt(trimmedLine, 10);
			updatedLines.push(line);
			isNextLineText = false;
			continue;
		}

		if (trimmedLine.includes("-->")) {
			updatedLines.push(line);
			isNextLineText = true;
			continue;
		}

		if (currentEntryId === entryId && isNextLineText && !foundEntry) {
			updatedLines.push(newText.trim());
			foundEntry = true;
			isNextLineText = false;
		} else {
			updatedLines.push(line);
			if (isNextLineText) {
				isNextLineText = false;
			}
		}
	}

	if (!foundEntry) {
		console.warn("Target entry not found in VTT content", {
			entryId,
			totalEntries: lines.filter((line) => /^\d+$/.test(line.trim())).length,
		});
	}

	const result = updatedLines.join("\n");

	return result;
}
