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
  logLearnerSignal,
  findLearnerInsights,
  findLearnerIntent,
  hasDocumentChunks,
  searchChunksBySimilarity,
  appendLearnerObservation,
  getRecentObservations,
} from "@/lib/db/repository";
import { embedQuery } from "@/lib/embeddings/client";
import { createChatTutor } from "@/agents/chat-tutor";
import { createFetchSourceContentTool } from "@/agents/tools/fetch-source-content";
import { createFetchPreviousSubtopicTool } from "@/agents/tools/fetch-previous-subtopic";
import { streamAgentText } from "@/agents/runner";
import { generateSlug } from "@/lib/types/learning";
import { formatInterviewForAgent } from "@/lib/interview-context";
import { extractObservation } from "@/lib/learner-observer";

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
  const subtopicIndex = module
    ? module.subtopics.findIndex((s) => s.id === subtopicId)
    : -1;
  if (topicRecord && moduleId && subtopicId && module) {
    const dbKey = moduleId * 100 + subtopicIndex;
    const cached = await findModuleContent(topicRecord.id, dbKey);
    if (cached) {
      subtopicContent = cached.content;
    }
  }

  // Semantic context: retrieve relevant source chunks for the user's question
  let sourceContext = "";
  if (topicRecord) {
    const hasChunks = await hasDocumentChunks(topicRecord.id);
    if (hasChunks) {
      try {
        const queryText = selectedText || message;
        const queryEmbedding = await embedQuery(queryText);
        const relevantChunks = await searchChunksBySimilarity(
          topicRecord.id,
          queryEmbedding,
          5,
          0.3
        );
        if (relevantChunks.length > 0) {
          sourceContext = relevantChunks
            .map(
              (c) =>
                `[${c.chapterTitle}${c.sectionTitle ? " > " + c.sectionTitle : ""}]\n${c.content}`
            )
            .join("\n\n---\n\n");
        }
      } catch (err) {
        console.warn("[chat] Semantic search failed, continuing without:", err);
      }
    }
  }

  // Prepare tools for source-based topics
  let tools;
  let sourceTitle;
  if (topicRecord && topicRecord.sourceType !== "topic_only") {
    const structure = await findSourceStructure(topicRecord.id);
    if (structure) {
      sourceTitle = structure.rawToc.title;
      tools = [createFetchSourceContentTool(topicRecord.id, topicSlug, topicRecord.sourceType, topicRecord.sourcePath ?? "")];
    }
  }

  // Add previous subtopic tool for continuity
  if (topicRecord && module && subtopicIndex > 0) {
    const prevTool = createFetchPreviousSubtopicTool(
      topicRecord.id,
      moduleId!,
      subtopicIndex,
      module.subtopics
    );
    if (tools) {
      tools.push(prevTool);
    } else {
      tools = [prevTool];
    }
  }

  // Fetch learner model for personalized tutoring
  let learnerContext: string | undefined;
  if (topicRecord) {
    const contextParts: string[] = [];

    // Original interview intent
    const learnerIntent = await findLearnerIntent(topicRecord.id);
    if (learnerIntent) {
      contextParts.push(formatInterviewForAgent(learnerIntent as Record<string, unknown>));
    }

    // Learned insights from quiz/chat analysis
    const insights = await findLearnerInsights(topicRecord.id);
    if (insights) {
      const weakAreas = insights.weakAreas as string[];
      const style = insights.learningStyle as Record<string, unknown>;
      const engagement = insights.engagementProfile as Record<string, unknown>;
      if (weakAreas.length > 0) contextParts.push(`Weak areas: ${weakAreas.join(", ")}`);
      if (style?.preferredApproach) contextParts.push(`Preferred learning approach: ${style.preferredApproach}`);
      if (style?.paceCategory) contextParts.push(`Learning pace: ${style.paceCategory}`);
      if (style?.helpSeekingPattern) contextParts.push(`Help-seeking pattern: ${style.helpSeekingPattern}`);
      if (engagement?.chatFrequency) contextParts.push(`Chat engagement: ${engagement.chatFrequency}`);
    }

    learnerContext = contextParts.length > 0 ? contextParts.join("\n") : undefined;
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

  // Combine subtopic content with semantically retrieved source material
  const combinedContent = sourceContext
    ? subtopicContent.slice(0, 4000) +
      "\n\n---\nRelevant source material:\n" +
      sourceContext.slice(0, 4000)
    : subtopicContent.slice(0, 6000);

  // Create the tutor agent
  const tutor = createChatTutor({
    topic: topic ?? "Unknown",
    level: curriculum?.level ?? "intermediate",
    moduleTitle: module?.title ?? "Unknown Module",
    subtopicTitle: subtopic?.title ?? "Unknown Subtopic",
    subtopicContent: combinedContent,
    sourceTitle,
    tools,
    learnerContext,
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

        // Log chat signal (fire-and-forget)
        if (topicRecord && action) {
          logLearnerSignal({
            topicId: topicRecord.id,
            moduleId: moduleId ?? undefined,
            subtopicId: subtopicId ?? undefined,
            signalType: "chat_action",
            data: { action, selectedText: selectedText?.slice(0, 200) },
          }).catch(console.error);
        }

        // Extract learner observation from this exchange (fire-and-forget)
        if (topicId) {
          (async () => {
            try {
              const existing = await getRecentObservations(topicId, 10);
              const observation = await extractObservation(
                fullMessage,
                fullResponse,
                existing.map((o) => o.observation)
              );
              if (observation) {
                await appendLearnerObservation({
                  topicId,
                  moduleId: moduleId ?? undefined,
                  subtopicId: subtopicId ?? undefined,
                  observation,
                });
              }
            } catch {
              // non-critical
            }
          })();
        }

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
