import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const headersList = headers();
		const cookieStore = cookies();
		
		// Get all cookies
		const allCookies = cookieStore.getAll();
		const clerkCookies = allCookies.filter(cookie => 
			cookie.name.includes('clerk') || 
			cookie.name.includes('__session') ||
			cookie.name.includes('__client_uat')
		);
		
		// Get relevant headers
		const userAgent = headersList.get('user-agent');
		const host = headersList.get('host');
		const origin = headersList.get('origin');
		const referer = headersList.get('referer');
		
		console.log("🔍 Session debug info:");
		console.log("Host:", host);
		console.log("Origin:", origin);
		console.log("Referer:", referer);
		console.log("Clerk cookies found:", clerkCookies.length);
		
		return NextResponse.json({
			success: true,
			host,
			origin,
			referer,
			userAgent: userAgent?.substring(0, 100) + "...",
			cookieCount: allCookies.length,
			clerkCookieCount: clerkCookies.length,
			clerkCookies: clerkCookies.map(c => ({
				name: c.name,
				hasValue: !!c.value,
				valueLength: c.value.length
			}))
		});
		
	} catch (error) {
		console.error("❌ Session debug error:", error);
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
