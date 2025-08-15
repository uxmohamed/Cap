import { db } from "@cap/database";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { createClient } from "@deepgram/sdk";
import { eq } from "drizzle-orm";
import { generateAiMetadata } from "@/actions/videos/generate-ai-metadata";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type TranscribeResult = {
	success: boolean;
	message: string;
};

export async function transcribeVideo(
	videoId: string,
	userId: string,
	aiGenerationEnabled = false,
): Promise<TranscribeResult> {
	if (!serverEnv().DEEPGRAM_API_KEY) {
		return {
			success: false,
			message: "Missing necessary environment variables",
		};
	}

	if (!userId || !videoId) {
		return {
			success: false,
			message: "userId or videoId not supplied",
		};
	}

	const query = await db()
		.select()
		.from(videos)
		.where(eq(videos.id, videoId));

	if (query.length === 0) {
		return { success: false, message: "Video does not exist" };
	}

	const video = query[0];
	if (!video) {
		return { success: false, message: "Video information is missing" };
	}

	if (
		video.transcriptionStatus === "COMPLETE" ||
		video.transcriptionStatus === "PROCESSING"
	) {
		return {
			success: true,
			message: "Transcription already completed or in progress",
		};
	}

	await db()
		.update(videos)
		.set({ transcriptionStatus: "PROCESSING" })
		.where(eq(videos.id, videoId));

	const supabase = createSupabaseClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	try {
		const videoKey = `${userId}/${videoId}/result.mp4`;

		// Get signed URL for video download
		const { data: urlData, error: urlError } = await supabase.storage
			.from("capso-videos")
			.createSignedUrl(videoKey, 3600); // 1 hour expiry

		if (urlError) {
			throw new Error(`Failed to get video URL: ${urlError.message}`);
		}

		const transcription = await transcribeAudio(urlData.signedUrl);

		if (transcription === "") {
			throw new Error("Failed to transcribe audio");
		}

		// Upload transcription to Supabase Storage
		const { error: uploadError } = await supabase.storage
			.from("capso-videos")
			.upload(`${userId}/${videoId}/transcription.vtt`, transcription, {
				contentType: "text/vtt",
				upsert: true,
			});

		if (uploadError) {
			throw new Error(`Failed to upload transcription: ${uploadError.message}`);
		}

		await db()
			.update(videos)
			.set({ transcriptionStatus: "COMPLETE" })
			.where(eq(videos.id, videoId));

		console.log(
			`[transcribeVideo] Transcription completed for video ${videoId}`,
		);

		if (aiGenerationEnabled) {
			console.log(
				`[transcribeVideo] AI generation enabled, triggering AI metadata generation for video ${videoId}`,
			);
			try {
				generateAiMetadata(videoId, userId).catch((error) => {
					console.error(
						`[transcribeVideo] Error generating AI metadata for video ${videoId}:`,
						error,
					);
				});
			} catch (error) {
				console.error(
					`[transcribeVideo] Error starting AI metadata generation for video ${videoId}:`,
					error,
				);
			}
		} else {
			console.log(
				`[transcribeVideo] AI generation disabled, skipping AI metadata generation for video ${videoId}`,
			);
		}

		return {
			success: true,
			message: "VTT file generated and uploaded successfully",
		};
	} catch (error) {
		console.error("Error transcribing video:", error);
		await db()
			.update(videos)
			.set({ transcriptionStatus: "ERROR" })
			.where(eq(videos.id, videoId));

		return { success: false, message: "Error processing video file" };
	}
}

function formatToWebVTT(result: any): string {
	let output = "WEBVTT\n\n";
	let captionIndex = 1;

	result.results.utterances.forEach((utterance: any) => {
		const words = utterance.words;
		let group = [];
		let start = formatTimestamp(words[0].start);
		let wordCount = 0;

		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			group.push(word.word);
			wordCount++;

			if (
				word.punctuated_word.endsWith(",") ||
				word.punctuated_word.endsWith(".") ||
				(words[i + 1] && words[i + 1].start - word.end > 0.5) ||
				wordCount === 8
			) {
				const end = formatTimestamp(word.end);
				const groupText = group.join(" ");

				output += `${captionIndex}\n${start} --> ${end}\n${groupText}\n\n`;
				captionIndex++;

				group = [];
				start = words[i + 1] ? formatTimestamp(words[i + 1].start) : start;
				wordCount = 0;
			}
		}
	});

	return output;
}

function formatTimestamp(seconds: number): string {
	const date = new Date(seconds * 1000);
	const hours = date.getUTCHours().toString().padStart(2, "0");
	const minutes = date.getUTCMinutes().toString().padStart(2, "0");
	const secs = date.getUTCSeconds().toString().padStart(2, "0");
	const millis = (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5);

	return `${hours}:${minutes}:${secs}.${millis}`;
}

async function transcribeAudio(videoUrl: string): Promise<string> {
	console.log("[transcribeAudio] Starting transcription for URL:", videoUrl);
	const deepgram = createClient(serverEnv().DEEPGRAM_API_KEY as string);

	const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
		{
			url: videoUrl,
		},
		{
			model: "nova-3",
			smart_format: true,
			detect_language: true,
			utterances: true,
			mime_type: "video/mp4",
		},
	);

	if (error) {
		console.error("[transcribeAudio] Deepgram transcription error:", error);
		return "";
	}

	console.log(
		"[transcribeAudio] Transcription result received, formatting to WebVTT",
	);
	const captions = formatToWebVTT(result);

	console.log("[transcribeAudio] Transcription complete, returning captions");
	return captions;
}
