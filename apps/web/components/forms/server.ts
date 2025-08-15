"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { organizations, organizationMembers, users } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoId } from "@cap/utils";
import { createClient } from "@supabase/supabase-js";
// Storage utilities now use Supabase; no direct S3 usage here.

export async function createOrganization(formData: FormData) {
	const user = await getCurrentUser();
	if (!user) throw new Error("Unauthorized");

	// Extract the name from the FormData
	const name = formData.get("name") as string;
	if (!name) throw new Error("Organization name is required");

	// Check if organization with the same name already exists
	const existingOrg = await db()
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.name, name))
		.limit(1);

	if (existingOrg.length > 0) {
		throw new Error("Organization with this name already exists");
	}

	const organizationId = nanoId();

	// Create the organization first
	const orgValues: {
		id: string;
		ownerId: string;
		name: string;
		iconUrl?: string;
	} = {
		id: organizationId,
		ownerId: user.id,
		name: name,
	};

	// Check if an icon file was uploaded
	const iconFile = formData.get("icon") as File;
	if (iconFile) {
		// Validate file type
		if (!iconFile.type.startsWith("image/")) {
			throw new Error("File must be an image");
		}

		// Validate file size (limit to 2MB)
		if (iconFile.size > 2 * 1024 * 1024) {
			throw new Error("File size must be less than 2MB");
		}

		// Create a unique file key
		const fileExtension = iconFile.name.split(".").pop();
		const fileKey = `organizations/${organizationId}/icon-${Date.now()}.${fileExtension}`;

		try {
			const supabase = createClient(
				serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
				serverEnv().SUPABASE_SERVICE_ROLE!
			);

			const { error } = await supabase.storage
				.from("capso-videos")
				.upload(fileKey, await iconFile.bytes(), {
					contentType: iconFile.type,
					upsert: true,
				});

			if (error) {
				throw new Error(`Failed to upload icon: ${error.message}`);
			}

			// Get the public URL for the uploaded icon
			const { data: urlData } = await supabase.storage
				.from("capso-videos")
				.getPublicUrl(fileKey);

			// Add the icon URL to the organization values
			orgValues.iconUrl = urlData.publicUrl;
		} catch (error) {
			console.error("Error uploading organization icon:", error);
			throw new Error(error instanceof Error ? error.message : "Upload failed");
		}
	}

	// Insert the organization with or without the icon URL
	await db().insert(organizations).values(orgValues);

	// Add the user as an owner of the organization
	await db().insert(organizationMembers).values({
		id: nanoId(),
		userId: user.id,
		role: "owner",
		organizationId,
	});

	// Set this as the active organization for the user
	await db()
		.update(users)
		.set({ activeOrganizationId: organizationId })
		.where(eq(users.id, user.id));

	revalidatePath("/dashboard");
	return { success: true, organizationId };
}
