import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { getHeaders } from "@/utils/helpers";
import type { NextRequest } from "next/server";

export const revalidate = 0;

export async function POST(request: NextRequest) {
	const origin = request.headers.get("origin") as string;

	return new Response(null, {
		status: 200,
		headers: getHeaders(origin),
	});
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const userId = searchParams.get("userId") || "";
	const videoId = searchParams.get("screenshotId") || "";
	const origin = request.headers.get("origin") as string;

	if (!userId || !videoId) {
		return new Response(
			JSON.stringify({
				error: true,
				message: "userId or videoId not supplied",
			}),
			{ status: 401, headers: getHeaders(origin) },
		);
	}

	const query = await db()
		.select()
		.from(videos)
		.where(eq(videos.id, videoId));

	if (query.length === 0) {
		return new Response(
			JSON.stringify({ error: true, message: "Video does not exist" }),
			{ status: 401, headers: getHeaders(origin) },
		);
	}

	const video = query[0];
	if (!video) {
		return new Response(
			JSON.stringify({ error: true, message: "Video not found" }),
			{ status: 401, headers: getHeaders(origin) },
		);
	}

	if (video.public === false) {
		const user = await getCurrentUser();

		if (!user || user.id !== video.ownerId) {
			return new Response(
				JSON.stringify({ error: true, message: "Video is not public" }),
				{ status: 401, headers: getHeaders(origin) },
			);
		}
	}

	const supabase = createClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	const screenshotPrefix = `${userId}/${videoId}/`;

	try {
		const { data: objects, error } = await supabase.storage
			.from("capso-videos")
			.list(screenshotPrefix);

		if (error) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "Error listing screenshots",
					details: error.message,
				}),
				{ status: 500, headers: getHeaders(origin) },
			);
		}

		const screenshot = objects?.find((object) =>
			object.name?.endsWith(".png"),
		);

		if (!screenshot) {
			return new Response(
				JSON.stringify({ error: true, message: "Screenshot not found" }),
				{ status: 404, headers: getHeaders(origin) },
			);
		}

		const screenshotKey = `${screenshotPrefix}${screenshot.name}`;
		const { data: urlData, error: urlError } = await supabase.storage
			.from("capso-videos")
			.createSignedUrl(screenshotKey, 3600); // 1 hour expiry

		if (urlError) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "Error generating screenshot URL",
					details: urlError.message,
				}),
				{ status: 500, headers: getHeaders(origin) },
			);
		}

		return new Response(JSON.stringify({ url: urlData.signedUrl }), {
			status: 200,
			headers: getHeaders(origin),
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error,
				message: "Error generating screenshot URL",
			}),
			{ status: 500, headers: getHeaders(origin) },
		);
	}
}
