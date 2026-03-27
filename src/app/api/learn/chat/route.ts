import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  findCurriculumByTopicId,
  findModuleContent,
  findSourceStructure,
  getChatHistory,
  getChatSessions,
  createChatSession,
  updateChatSessionTitle,
  appendChatMessage,
} from "@/lib/db/repository";
import { createChatTutor } from "@/agents/chat-tutor";
import { createFetchPDFSectionTool } from "@/agents/tools/fetch-pdf-section";
import { streamAgentText } from "@/agents/runner";
import { generateSlug } from "@/lib/types/learning";

export const maxDuration = 120;

// GET — Fetch sessions or session history
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const topicId = parseInt(params.get("topicId") ?? "0");
  const sessionId = parseInt(params.get("sessionId") ?? "0");

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  // If sessionId provided, return that session's messages
  if (sessionId) {
    const messages = await getChatHistory(sessionId);
    return NextResponse.json({ messages });
  }

  // Otherwise return all sessions for this topic
  const sessions = await getChatSessions(topicId);
  return NextResponse.json({ sessions });
}

// POST — Send message, stream response via SSE
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    topicId,
    topic,
    sessionId,
    moduleId,
    subtopicId,
    message,
    history = [],
    action,
    selectedText,
  } = body;

  if (!topicId || !message) {
    return NextResponse.json(
      { error: "topicId and message are required" },
      { status: 400 }
    );
  }

  // Create session if not provided
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const session = await createChatSession(topicId);
    activeSessionId = session.id;
  }

  // Persist user message
  await appendChatMessage(
    activeSessionId,
    topicId,
    moduleId ?? null,
    subtopicId ?? null,
    "user",
    message
  );

  // Get topic info
  const providedSlug = body.slug as string | undefined;
  const topicSlug = providedSlug || (topic ? generateSlug(topic) : "");
  const topicRecord = topicSlug
    ? await findTopicBySlug(topicSlug)
    : null;

  // Get curriculum for context
  const curriculum = topicRecord
    ? await findCurriculumByTopicId(topicRecord.id)
    : null;

  const module = curriculum?.modules.find((m) => m.id === moduleId);
  const subtopic = module?.subtopics.find((s) => s.id === subtopicId);

  // Get current subtopic content from DB
  let subtopicContent = "";
  if (topicRecord && moduleId && subtopicId && module) {
    const subtopicIndex = module.subtopics.findIndex(
      (s) => s.id === subtopicId
    );
    const dbKey = moduleId * 100 + subtopicIndex;
    const cached = await findModuleContent(topicRecord.id, dbKey);
    if (cached) {
      subtopicContent = cached.content;
    }
  }

  // Prepare tools for source-based topics
  let tools;
  let sourceTitle;
  if (topicRecord && topicRecord.sourceType !== "topic_only") {
    const structure = await findSourceStructure(topicRecord.id);
    if (structure) {
      sourceTitle = structure.rawToc.title;
      tools = [createFetchPDFSectionTool(topicRecord.id, topicSlug)];
    }
  }

  // Build the chat message with context
  let fullMessage = "";

  if (history.length > 0) {
    const recentHistory = history.slice(-20);
    fullMessage += "Previous conversation:\n";
    for (const msg of recentHistory) {
      fullMessage += `${msg.role === "user" ? "Learner" : "Tutor"}: ${msg.content}\n`;
    }
    fullMessage += "\n---\n\n";
  }

  if (action && selectedText) {
    const actionLabels: Record<string, string> = {
      explain: "explain this from first principles",
      go_deeper: "go deeper on this — expand with nuance and edge cases",
      simplify: "simplify this using everyday language and analogies",
    };
    fullMessage += `The learner selected this text from the content: "${selectedText}"\n\nThey want you to: ${actionLabels[action] ?? action}\n\nRespond directly to this request.`;
  } else {
    fullMessage += `Learner's question: ${message}`;
  }

  // Create the tutor agent
  const tutor = createChatTutor({
    topic: topic ?? "Unknown",
    level: curriculum?.level ?? "intermediate",
    moduleTitle: module?.title ?? "Unknown Module",
    subtopicTitle: subtopic?.title ?? "Unknown Subtopic",
    subtopicContent: subtopicContent.slice(0, 6000),
    sourceTitle,
    tools,
  });

  // Stream the response via SSE
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamAgentText(tutor, fullMessage)) {
          fullResponse += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }

        await appendChatMessage(
          activeSessionId,
          topicId,
          moduleId ?? null,
          subtopicId ?? null,
          "assistant",
          fullResponse
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, sessionId: activeSessionId })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Chat failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errMsg })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// PATCH — Update session title
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { sessionId, title } = body;

  if (!sessionId || !title) {
    return NextResponse.json(
      { error: "sessionId and title are required" },
      { status: 400 }
    );
  }

  await updateChatSessionTitle(sessionId, title);
  return NextResponse.json({ success: true });
}
