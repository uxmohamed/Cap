import { getCurrentUser } from "@cap/database/auth/session";
import { auth } from "@clerk/nextjs/server";
import { db } from "@cap/database";
import { users } from "@cap/database/schema-postgres";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		console.log("🔍 Debug endpoint called");
		
		// Step 1: Check Clerk auth
		const { userId } = await auth();
		console.log("🔍 Clerk userId:", userId);
		
		if (!userId) {
			return NextResponse.json({
				success: true,
				step: "clerk_auth_failed",
				clerkUserId: null,
				shortId: null,
				user: null
			});
		}
		
		// Step 2: Convert to short ID
		const shortId = userId.replace('user_', '').substring(0, 15);
		console.log("🔍 Short ID:", shortId);
		
		// Step 3: Query database directly
		const [dbUser] = await db()
			.select()
			.from(users)
			.where(eq(users.id, shortId));
		
		console.log("🔍 Database query result:", dbUser ? "found" : "not found");
		
		// Step 4: Test getCurrentUser function
		const user = await getCurrentUser();
		console.log("🔍 getCurrentUser result:", user ? "found" : "not found");
		
		return NextResponse.json({
			success: true,
			step: "complete",
			clerkUserId: userId,
			shortId: shortId,
			dbUserFound: !!dbUser,
			getCurrentUserResult: !!user,
			user: user ? {
				id: user.id,
				email: user.email,
				name: user.name,
				activeOrganizationId: user.activeOrganizationId
			} : null
		});
		
	} catch (error) {
		console.error("❌ Debug endpoint error:", error);
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined
		}, { status: 500 });
	}
}
