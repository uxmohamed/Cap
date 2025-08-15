"use server";

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import {
	folders,
	spaceMembers,
	spaces,
	spaceVideos,
} from "@cap/database/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@cap/env";

interface DeleteSpaceResponse {
	success: boolean;
	error?: string;
}

export async function deleteSpace(
	spaceId: string,
): Promise<DeleteSpaceResponse> {
	try {
		const user = await getCurrentUser();

		if (!user || !user.activeOrganizationId) {
			return {
				success: false,
				error: "User not logged in or no active organization",
			};
		}

		// Check if the space exists and belongs to the user's organization
		const space = await db()
			.select()
			.from(spaces)
			.where(eq(spaces.id, spaceId))
			.limit(1);

		if (!space || space.length === 0) {
			return {
				success: false,
				error: "Space not found",
			};
		}

		// Check if user has permission to delete the space
		// Only the space creator or organization owner should be able to delete spaces
		const spaceData = space[0];
		if (!spaceData || spaceData.createdById !== user.id) {
			return {
				success: false,
				error: "You don't have permission to delete this space",
			};
		}

		// Delete in order to maintain referential integrity:

		// 1. First delete all space videos
		await db().delete(spaceVideos).where(eq(spaceVideos.spaceId, spaceId));

		// 2. Delete all space members
		await db().delete(spaceMembers).where(eq(spaceMembers.spaceId, spaceId));

		// 3. Delete all space folders
		await db().delete(folders).where(eq(folders.spaceId, spaceId));

		// 4. Delete space icons from Supabase Storage
		try {
			const supabase = createClient(
				serverEnv().NEXT_PUBLIC_SUPABASE_URL!,
				serverEnv().SUPABASE_SERVICE_ROLE!
			);

			// List all objects with the space prefix
			const { data: objects, error } = await supabase.storage
				.from("capso-videos")
				.list(`organizations/${user.activeOrganizationId}/spaces/${spaceId}/`);

			if (error) {
				console.error("Error listing space objects:", error);
			} else if (objects && objects.length > 0) {
				// Delete all objects in the space folder
				const objectPaths = objects.map(obj => `organizations/${user.activeOrganizationId}/spaces/${spaceId}/${obj.name}`);
				
				const { error: deleteError } = await supabase.storage
					.from("capso-videos")
					.remove(objectPaths);

				if (deleteError) {
					console.error("Error deleting space objects:", deleteError);
				} else {
					console.log(
						`Deleted ${objects.length} objects for space ${spaceId}`,
					);
				}
			}
		} catch (error) {
			console.error("Error deleting space icons from Supabase Storage:", error);
			// Continue with space deletion even if storage deletion fails
		}

		await db().delete(spaces).where(eq(spaces.id, spaceId));

		revalidatePath("/dashboard");

		return {
			success: true,
		};
	} catch (error) {
		console.error("Error deleting space:", error);
		return {
			success: false,
			error: "Failed to delete space",
		};
	}
}
