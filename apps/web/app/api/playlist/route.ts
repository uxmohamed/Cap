import { NextResponse } from "next/server";

export const revalidate = "force-dynamic";

export async function GET() {
	return NextResponse.json({ error: "S3 functionality not yet migrated to Supabase" }, { status: 500 });
}

export async function HEAD() {
	return NextResponse.json({ error: "S3 functionality not yet migrated to Supabase" }, { status: 500 });
}
