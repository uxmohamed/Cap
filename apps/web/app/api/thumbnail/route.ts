import { db } from "@cap/database";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { getHeaders } from "@/utils/helpers";

export const revalidate = 0;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get("userId");
	const videoId = searchParams.get("videoId");
	const origin = request.headers.get("origin") || "*";

	if (!userId || !videoId) {
		return new Response(
			JSON.stringify({
				error: true,
				message: "userId or videoId not supplied",
			}),
			{
				status: 400,
				headers: getHeaders(origin),
			},
		);
	}

	const query = await db()
		.select()
		.from(videos)
		.where(eq(videos.id, videoId));

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
				status: 401,
				headers: getHeaders(origin),
			},
		);
	}

	const prefix = `${userId}/${videoId}/`;
	const thumbnailKey = `${prefix}screenshot/screen-capture.jpg`;

	const supabase = createClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	try {
		// Check if thumbnail exists
		const { data: exists, error: headError } = await supabase.storage
			.from("capso-videos")
			.list(prefix);

		if (headError) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "Error checking thumbnail existence",
					details: headError.message,
				}),
				{
					status: 500,
					headers: getHeaders(origin),
				},
			);
		}

		const thumbnailExists = exists?.some(item => item.name === "screen-capture.jpg");

		if (!thumbnailExists) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "No thumbnail found for this video",
				}),
				{
					status: 404,
					headers: getHeaders(origin),
				},
			);
		}

		// Generate signed URL for thumbnail
		const { data: urlData, error: urlError } = await supabase.storage
			.from("capso-videos")
			.createSignedUrl(thumbnailKey, 3600); // 1 hour expiry

		if (urlError) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "Error generating thumbnail URL",
					details: urlError.message,
				}),
				{
					status: 500,
					headers: getHeaders(origin),
				},
			);
		}

		return new Response(JSON.stringify({ screen: urlData.signedUrl }), {
			status: 200,
			headers: getHeaders(origin),
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: true,
				message: "Error generating thumbnail URL",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: getHeaders(origin),
			},
		);
	}
}
