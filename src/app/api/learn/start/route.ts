import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import { findTopicBySlug } from "@/lib/db/repository";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic } = body;

  if (!topic || typeof topic !== "string") {
    return NextResponse.json(
      { error: "Topic is required" },
      { status: 400 }
    );
  }

  const topicSlug = generateSlug(topic);
  const existing = await findTopicBySlug(topicSlug);

  return NextResponse.json({
    topicSlug,
    displayName: topic,
    exists: !!existing,
    topicId: existing?.id ?? null,
    scopingQuestions: [
      {
        id: "level",
        question: "What is your current knowledge level?",
        options: ["beginner", "intermediate", "advanced"],
      },
      {
        id: "goal",
        question: "What is your learning goal?",
        options: [
          "general understanding",
          "professional development",
          "interview preparation",
          "curiosity",
        ],
      },
      {
        id: "timeCommitment",
        question: "How much time do you want to invest?",
        options: [
          { value: "quick", label: "Quick overview (~30-60 min)" },
          { value: "standard", label: "Standard (2-4 hours)" },
          { value: "deep", label: "Deep dive (8+ hours)" },
        ],
      },
      {
        id: "interests",
        question: "Any specific areas you want to focus on? (optional)",
        type: "text",
      },
    ],
  });
}
