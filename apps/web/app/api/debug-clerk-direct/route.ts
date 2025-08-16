import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		console.log("🔍 Testing Clerk currentUser directly");
		
		const clerkUser = await currentUser();
		console.log("👤 Clerk user result:", clerkUser ? "found" : "not found");
		
		if (clerkUser) {
			console.log("👤 User details:", {
				id: clerkUser.id,
				email: clerkUser.emailAddresses[0]?.emailAddress
			});
		}
		
		return NextResponse.json({
			success: true,
			hasUser: !!clerkUser,
			userId: clerkUser?.id || null,
			email: clerkUser?.emailAddresses[0]?.emailAddress || null
		});
		
	} catch (error) {
		console.error("❌ Clerk direct test error:", error);
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
