"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { spaces } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sanitizeFile } from "@/lib/sanitizeFile";
import { createClient } from "@supabase/supabase-js";

export async function uploadSpaceIcon(formData: FormData, spaceId: string) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	// Fetch the space and check permissions
	const spaceArr = await db()
		.select()
		.from(spaces)
		.where(eq(spaces.id, spaceId));

	if (!spaceArr || spaceArr.length === 0) {
		throw new Error("Space not found");
	}
	const space = spaceArr[0];

	if (!space) {
		throw new Error("Space not found");
	}

	if (space.organizationId !== user.activeOrganizationId) {
		throw new Error("You do not have permission to update this space");
	}

	const file = formData.get("icon") as File;
	if (!file) {
		throw new Error("No file provided");
	}
	if (!file.type.startsWith("image/")) {
		throw new Error("File must be an image");
	}
	if (file.size > 2 * 1024 * 1024) {
		throw new Error("File size must be less than 2MB");
	}

	// Prepare new file key
	const fileExtension = file.name.split(".").pop();
	const fileKey = `organizations/${
		space.organizationId
	}/spaces/${spaceId}/icon-${Date.now()}.${fileExtension}`;

	const supabase = createClient(
		serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
		serverEnv().SUPABASE_SERVICE_ROLE!
	);

	try {
		// Remove previous icon if exists
		if (space.iconUrl) {
			// Try to extract the previous key from the URL
			const prevKeyMatch = space.iconUrl.match(/organizations\/.+/);
			if (prevKeyMatch && prevKeyMatch[0]) {
				try {
					await supabase.storage
						.from("capso-videos")
						.remove([prevKeyMatch[0]]);
				} catch (e) {
					// Log and continue
					console.warn("Failed to delete old space icon from Supabase Storage", e);
				}
			}
		}

		const sanitizedFile = await sanitizeFile(file);

		const { error } = await supabase.storage
			.from("capso-videos")
			.upload(fileKey, await sanitizedFile.bytes(), {
				contentType: file.type,
				upsert: true,
			});

		if (error) {
			throw new Error(`Failed to upload icon: ${error.message}`);
		}

		// Get the public URL for the uploaded icon
		const { data: urlData } = await supabase.storage
			.from("capso-videos")
			.getPublicUrl(fileKey);

		// Update space with new icon URL
		await db().update(spaces).set({ iconUrl: urlData.publicUrl }).where(eq(spaces.id, spaceId));

		revalidatePath("/dashboard");
		return { success: true, iconUrl: urlData.publicUrl };
	} catch (error) {
		console.error("Error uploading space icon:", error);
		throw new Error(error instanceof Error ? error.message : "Upload failed");
	}
}
