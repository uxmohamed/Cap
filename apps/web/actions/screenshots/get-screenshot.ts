import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

export async function getScreenshot(userId: string, screenshotId: string) {
	if (!userId || !screenshotId) {
		throw new Error("userId or screenshotId not supplied");
	}

	const query = await db()
		.select()
		.from(videos)
		.where(eq(videos.id, screenshotId));

	if (query.length === 0) {
		throw new Error("Video does not exist");
	}

	const video = query[0];
	if (!video) {
		throw new Error("Video not found");
	}

	if (video.public === false) {
		const user = await getCurrentUser();

		if (!user || user.id !== video.ownerId) {
			throw new Error("Video is not public");
		}
	}

	const supabase = createClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	const screenshotPrefix = `${userId}/${screenshotId}/`;

	try {
		const { data: objects, error } = await supabase.storage
			.from("capso-videos")
			.list(screenshotPrefix);

		if (error) {
			throw new Error(`Failed to list screenshots: ${error.message}`);
		}

		const screenshot = objects?.find((object) =>
			object.name?.endsWith(".png"),
		);

		if (!screenshot) {
			throw new Error("Screenshot not found");
		}

		const screenshotKey = `${screenshotPrefix}${screenshot.name}`;
		const { data: urlData, error: urlError } = await supabase.storage
			.from("capso-videos")
			.createSignedUrl(screenshotKey, 3600); // 1 hour expiry

		if (urlError) {
			throw new Error(`Failed to generate screenshot URL: ${urlError.message}`);
		}

		return { url: urlData.signedUrl };
	} catch (error) {
		throw new Error(`Error generating screenshot URL: ${error}`);
	}
}
