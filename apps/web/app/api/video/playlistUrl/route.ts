import { db } from "@cap/database";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { CACHE_CONTROL_HEADERS, getHeaders } from "@/utils/helpers";

export const revalidate = 0;

export async function OPTIONS(request: NextRequest) {
	const origin = request.headers.get("origin") as string;

	return new Response(null, {
		status: 200,
		headers: getHeaders(origin),
	});
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const userId = searchParams.get("userId") || "";
	const videoId = searchParams.get("videoId") || "";
	const origin = request.headers.get("origin") as string;

	if (!userId || !videoId) {
		return new Response(
			JSON.stringify({
				error: true,
				message: "userId or videoId not supplied",
			}),
			{
				status: 401,
				headers: getHeaders(origin),
			},
		);
	}

	const query = await db().select().from(videos).where(eq(videos.id, videoId));

	if (query.length === 0) {
		return new Response(
			JSON.stringify({ error: true, message: "Video does not exist" }),
			{
				status: 401,
				headers: getHeaders(origin),
			},
		);
	}

	const video = query[0];
	if (!video) {
		return new Response(
			JSON.stringify({ error: true, message: "Video not found" }),
			{
				status: 404,
				headers: getHeaders(origin),
			},
		);
	}

	if (video.jobStatus === "COMPLETE") {
		const supabase = createClient(
			serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
			serverEnv().SUPABASE_SERVICE_ROLE!
		);

		const playlistKey = `${video.ownerId}/${video.id}/output/video_recording_000_output.m3u8`;
		
		try {
			const { data: urlData, error } = await supabase.storage
				.from("capso-videos")
				.createSignedUrl(playlistKey, 3600); // 1 hour expiry

			if (error) {
				console.error("Error generating playlist URL:", error);
				return new Response(
					JSON.stringify({ error: true, message: "Failed to generate playlist URL" }),
					{
						status: 500,
						headers: getHeaders(origin),
					},
				);
			}

			return new Response(
				JSON.stringify({ playlistOne: urlData.signedUrl, playlistTwo: null }),
				{
					status: 200,
					headers: {
						...getHeaders(origin),
						...CACHE_CONTROL_HEADERS,
					},
				},
			);
		} catch (error) {
			console.error("Error generating playlist URL:", error);
			return new Response(
				JSON.stringify({ error: true, message: "Failed to generate playlist URL" }),
				{
					status: 500,
					headers: getHeaders(origin),
				},
			);
		}
	}

	return new Response(
		JSON.stringify({
			playlistOne: `${serverEnv().WEB_URL}/api/playlist?userId=${
				video.ownerId
			}&videoId=${video.id}&videoType=video`,
			playlistTwo: `${serverEnv().WEB_URL}/api/playlist?userId=${
				video.ownerId
			}&videoId=${video.id}&videoType=audio`,
		}),
		{
			status: 200,
			headers: {
				...getHeaders(origin),
				...CACHE_CONTROL_HEADERS,
			},
		},
	);
}
