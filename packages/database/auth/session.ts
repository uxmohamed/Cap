import { eq, type InferSelectModel } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { db } from "../";
import { users } from "../schema-postgres";

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
		console.log("🔍 getCurrentUser called...");
		
		const { userId } = await auth();
		console.log("🔍 Clerk userId:", userId);
		
		if (!userId) {
			console.log("❌ No userId from Clerk auth");
			return null;
		}

		// Convert to short ID format for database lookup
		const shortId = userId.replace('user_', '').substring(0, 15);
		console.log("🔍 Querying database for user:", shortId, "(from Clerk ID:", userId + ")");
		const [currentUser] = await db()
			.select()
			.from(users)
			.where(eq(users.id, shortId));

		console.log("🔍 Database result:", currentUser ? "found" : "not found");
		return currentUser ?? null;
	}
);

export const syncUserWithDatabase = async (): Promise<InferSelectModel<typeof users> | null> => {
	try {
		console.log("🔍 Starting user sync...");
		
		const clerkUser = await currentUser();
		console.log("👤 Clerk user:", clerkUser ? { id: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress } : "null");
		
		if (!clerkUser) {
			console.log("❌ No Clerk user found");
			return null;
		}

		// Check if user exists in database
		const shortId = clerkUser.id.replace('user_', '').substring(0, 15);
		const [existingUser] = await db()
			.select()
			.from(users)
			.where(eq(users.id, shortId))
			.limit(1);

		console.log("🔍 Existing user in DB:", existingUser ? "found" : "not found");

		if (existingUser) {
			console.log("✅ User exists, updating...");
			// Update user if needed
			await db()
				.update(users)
				.set({
					email: clerkUser.emailAddresses[0]?.emailAddress || existingUser.email,
					emailVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified" ? new Date() : null,
					name: clerkUser.firstName || existingUser.name,
					lastName: clerkUser.lastName || existingUser.lastName,
					image: clerkUser.imageUrl || existingUser.image,
				})
				.where(eq(users.id, shortId));
			
			console.log("✅ User updated successfully");
			return existingUser;
		}

		console.log("🆕 Creating new user...");
		// Create new user with all required fields
		const newUser = {
			id: shortId,
			email: clerkUser.emailAddresses[0]?.emailAddress || "",
			emailVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified" ? new Date() : null,
			name: clerkUser.firstName || "",
			lastName: clerkUser.lastName || "",
			image: clerkUser.imageUrl || "",
			activeOrganizationId: "",
			stripeCustomerId: null,
			stripeSubscriptionId: null,
			stripeSubscriptionStatus: null,
			thirdPartyStripeSubscriptionId: null,
			inviteQuota: 0,
		};

		console.log("📝 New user data:", { id: newUser.id, email: newUser.email, name: newUser.name });

		await db().insert(users).values(newUser);
		console.log("✅ New user created successfully");
		
		return newUser as InferSelectModel<typeof users>;
	} catch (error) {
		console.error("❌ Error in syncUserWithDatabase:", error);
		return null;
	}
};

export const userSelectProps = users.$inferSelect;
