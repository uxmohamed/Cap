import { eq, type InferSelectModel } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { db } from "../";
import { users } from "../schema";
import { nanoId } from "../helpers";

export const getSession = async () => {
	const { userId } = await auth();
	
	if (!userId) return null;

	const [currentUser] = await db()
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	return currentUser ? { user: currentUser } : null;
};

export const getCurrentUser = cache(
	async (): Promise<InferSelectModel<typeof users> | null> => {
		const { userId } = await auth();
		
		if (!userId) return null;

		const [currentUser] = await db()
			.select()
			.from(users)
			.where(eq(users.id, userId));

		return currentUser ?? null;
	}
);

export const syncUserWithDatabase = async () => {
	const clerkUser = await currentUser();
	
	if (!clerkUser) return null;

	// Check if user exists in database
	const [existingUser] = await db()
		.select()
		.from(users)
		.where(eq(users.id, clerkUser.id))
		.limit(1);

	if (existingUser) {
		// Update user if needed
		await db()
			.update(users)
			.set({
				email: clerkUser.emailAddresses[0]?.emailAddress || existingUser.email,
				name: clerkUser.firstName || existingUser.name,
				lastName: clerkUser.lastName || existingUser.lastName,
				image: clerkUser.imageUrl || existingUser.image,
			})
			.where(eq(users.id, clerkUser.id));
		
		return existingUser;
	}

	// Create new user
	const newUser = {
		id: clerkUser.id,
		email: clerkUser.emailAddresses[0]?.emailAddress || "",
		emailVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified",
		name: clerkUser.firstName || "",
		lastName: clerkUser.lastName || "",
		image: clerkUser.imageUrl || "",
		activeOrganizationId: "",
	};

	await db().insert(users).values(newUser);

	return newUser;
};

export const userSelectProps = users.$inferSelect;
