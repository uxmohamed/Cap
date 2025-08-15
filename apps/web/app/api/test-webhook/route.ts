import { db } from '@cap/database';
import { users } from '@cap/database/schema-postgres';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function POST() {
	try {
		console.log("🧪 Testing webhook user creation...");
		
		// Create a test user similar to what the webhook would do
		const testUserData = {
			id: "test-user-" + Date.now(),
			email: "test@example.com",
			emailVerified: new Date(),
			name: "Test User",
			lastName: "Test",
			image: "",
			activeOrganizationId: "",
			stripeCustomerId: null,
			stripeSubscriptionId: null,
			stripeSubscriptionStatus: null,
			thirdPartyStripeSubscriptionId: null,
			inviteQuota: 0,
		};
		
		console.log("💾 Inserting test user:", testUserData);
		
		await db().insert(users).values(testUserData);
		
		console.log("✅ Test user created successfully");
		
		// Verify the user was created
		const createdUser = await db()
			.select()
			.from(users)
			.where(eq(users.id, testUserData.id));
		
		console.log("🔍 Verification - found user:", createdUser.length > 0);
		
		return NextResponse.json({
			success: true,
			message: "Test user created successfully",
			userId: testUserData.id,
			userFound: createdUser.length > 0
		});
		
	} catch (error) {
		console.error("❌ Test webhook failed:", error);
		console.error("🔍 Error details:", {
			message: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined
		});
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}
