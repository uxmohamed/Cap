import { db } from '@cap/database';
import { users } from '@cap/database/schema-postgres';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		console.log("🧪 Testing database connection...");
		
		// Test database connection
		const allUsers = await db().select().from(users);
		console.log(`✅ Database connection successful. Found ${allUsers.length} users`);
		
		return NextResponse.json({
			success: true,
			userCount: allUsers.length,
			users: allUsers.map(user => ({
				id: user.id,
				email: user.email,
				name: user.name,
				createdAt: user.createdAt
			}))
		});
	} catch (error) {
		console.error("❌ Database test failed:", error);
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}
