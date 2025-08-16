import { NextResponse } from "next/server";

export async function GET() {
	try {
		const hasClerkSecretKey = !!process.env.CLERK_SECRET_KEY;
		const hasPublishableKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
		const hasDatabaseUrl = !!process.env.DATABASE_URL;
		
		return NextResponse.json({
			success: true,
			env: {
				CLERK_SECRET_KEY: hasClerkSecretKey ? "✅ Set" : "❌ Missing",
				NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: hasPublishableKey ? "✅ Set" : "❌ Missing", 
				DATABASE_URL: hasDatabaseUrl ? "✅ Set" : "❌ Missing",
				NODE_ENV: process.env.NODE_ENV || "unknown"
			}
		});
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
