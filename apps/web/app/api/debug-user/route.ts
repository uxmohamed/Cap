import { getCurrentUser } from "@cap/database/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		console.log("🔍 Debug endpoint called");
		
		const user = await getCurrentUser();
		console.log("👤 User result:", user);
		
		return NextResponse.json({
			success: true,
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
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
