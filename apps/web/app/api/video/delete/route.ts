import { NextResponse } from "next/server";

export async function DELETE() {
	return NextResponse.json({ error: "Video deletion not yet implemented" }, { status: 500 });
}
