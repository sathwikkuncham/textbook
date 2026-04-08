import { NextRequest, NextResponse } from "next/server";
import { getAllTopics, deleteTopic } from "@/lib/db/repository";

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

export async function DELETE(request: NextRequest) {
  const { topicId } = await request.json();

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  try {
    await deleteTopic(topicId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
