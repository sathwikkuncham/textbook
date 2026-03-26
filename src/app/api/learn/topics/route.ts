import { NextResponse } from "next/server";
import { getAllTopics } from "@/lib/db/repository";

export async function GET() {
  try {
    const topicsList = await getAllTopics();
    return NextResponse.json({ topics: topicsList });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch topics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
