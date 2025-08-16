import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		console.log("🧪 Test middleware endpoint called");
		
		const authResult = auth();
		console.log("🧪 Auth result:", authResult);
		
		return NextResponse.json({
			success: true,
			hasUserId: !!authResult.userId,
			userId: authResult.userId,
			sessionId: authResult.sessionId,
			orgId: authResult.orgId
		});
		
	} catch (error) {
		console.error("❌ Test middleware error:", error);
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
