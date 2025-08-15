"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { organizations } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import DOMPurify from "dompurify";
import { eq } from "drizzle-orm";
import { JSDOM } from "jsdom";
import { revalidatePath } from "next/cache";
import { sanitizeFile } from "@/lib/sanitizeFile";
import { createClient } from "@supabase/supabase-js";

export async function uploadOrganizationIcon(
	formData: FormData,
	organizationId: string,
) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	const organization = await db()
		.select()
		.from(organizations)
		.where(eq(organizations.id, organizationId));

	if (!organization || organization.length === 0) {
		throw new Error("Organization not found");
	}

	if (organization[0]?.ownerId !== user.id) {
		throw new Error("Only the owner can update organization icon");
	}

	const file = formData.get("file") as File;

	if (!file) {
		throw new Error("No file provided");
	}

	// Validate file type
	if (!file.type.startsWith("image/")) {
		throw new Error("File must be an image");
	}

	// Validate file size (limit to 2MB)
	if (file.size > 2 * 1024 * 1024) {
		throw new Error("File size must be less than 2MB");
	}

	// Create a unique file key
	const fileExtension = file.name.split(".").pop();
	const fileKey = `organizations/${organizationId}/icon-${Date.now()}.${fileExtension}`;

	try {
		const sanitizedFile = await sanitizeFile(file);

		const supabase = createClient(
			serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
			serverEnv().SUPABASE_SERVICE_ROLE!
		);

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

		// Update organization with new icon URL
		await db()
			.update(organizations)
			.set({ iconUrl: urlData.publicUrl })
			.where(eq(organizations.id, organizationId));

		revalidatePath("/dashboard/settings/organization");

		return { success: true, iconUrl: urlData.publicUrl };
	} catch (error) {
		console.error("Error uploading organization icon:", error);
		throw new Error(error instanceof Error ? error.message : "Upload failed");
	}
}
