import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  findCurriculumByTopicId,
  findResearchByTopicId,
  findLearnerIntent,
  findLearnerInsights,
  getRecentObservations,
  saveCurriculum,
} from "@/lib/db/repository";
import { formatInterviewForAgent } from "@/lib/interview-context";
import { orchestrateModule } from "@/agents/module-orchestrator";
import type { Curriculum, Subtopic } from "@/lib/types/learning";

export const maxDuration = 800;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, moduleId } = body as { slug: string; moduleId: number };

  if (!slug || moduleId === undefined) {
    return NextResponse.json(
      { error: "slug and moduleId are required" },
      { status: 400 }
    );
  }

  const topicRecord = await findTopicBySlug(slug);
  if (!topicRecord) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const curriculum = await findCurriculumByTopicId(topicRecord.id);
  if (!curriculum) {
    return NextResponse.json({ error: "Curriculum not found" }, { status: 404 });
  }

  const module = curriculum.modules.find((m) => m.id === moduleId);
  if (!module) {
    return NextResponse.json(
      { error: `Module ${moduleId} not found` },
      { status: 404 }
    );
  }

  if (!module.plan) {
    return NextResponse.json(
      { error: "Module has no plan — may be a legacy curriculum" },
      { status: 400 }
    );
  }

  if (module.generated && module.subtopics.length > 0) {
    return NextResponse.json(
      { error: "Module already generated" },
      { status: 400 }
    );
  }

  // Gather context
  const research = await findResearchByTopicId(topicRecord.id);
  if (!research) {
    return NextResponse.json({ error: "Research not found" }, { status: 400 });
  }

  const learnerIntent = await findLearnerIntent(topicRecord.id);
  const interviewContext = learnerIntent
    ? formatInterviewForAgent(learnerIntent as Record<string, unknown>)
    : `Goal: ${curriculum.goal}`;

  // Learner context (observations + insights)
  const contextParts: string[] = [];
  if (learnerIntent) {
    const intent = learnerIntent as Record<string, unknown>;
    if (intent.purpose) contextParts.push(`Purpose: ${intent.purpose}`);
    if (intent.priorKnowledge) contextParts.push(`Prior knowledge: ${intent.priorKnowledge}`);
    if (intent.desiredDepth) contextParts.push(`Desired depth: ${intent.desiredDepth}`);
    const focusAreas = intent.focusAreas as string[] | undefined;
    if (focusAreas?.length) contextParts.push(`Focus areas: ${focusAreas.join(", ")}`);
  }

  const learnerInsights = await findLearnerInsights(topicRecord.id);
  if (learnerInsights) {
    const weakAreas = learnerInsights.weakAreas as string[];
    const style = learnerInsights.learningStyle as Record<string, unknown>;
    if (weakAreas.length > 0) contextParts.push(`Weak areas: ${weakAreas.join(", ")}`);
    if (style?.preferredApproach) contextParts.push(`Preferred approach: ${style.preferredApproach}`);
  }

  const observations = await getRecentObservations(topicRecord.id, 25);
  if (observations.length > 0) {
    contextParts.push(
      `\nLearning pattern observations:\n${observations.map((o) => `- ${o.observation}`).join("\n")}`
    );
  }

  const researchContext = JSON.stringify(research, null, 2)
    .slice(0, 6000)
    .replace(/[{}]/g, "");

  // Stream orchestrator events via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = orchestrateModule({
          topicId: topicRecord.id,
          topicSlug: slug,
          topic: topicRecord.displayName,
          moduleId,
          moduleTitle: module.title,
          plan: module.plan!,
          curriculum,
          interviewContext,
          learnerContext: contextParts.length > 0 ? contextParts.join("\n") : undefined,
          researchContext,
          sourceType: topicRecord.sourceType,
          sourcePath: topicRecord.sourcePath,
        });

        let generatedSections: Array<{ title: string; score: number }> = [];

        for await (const event of events) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );

          // When module completes, update the curriculum with generated sections
          if (event.type === "module_complete") {
            generatedSections = event.sections;
          }
        }

        // After generation completes, update curriculum with the generated subtopics
        if (generatedSections.length > 0) {
          const moduleIdx = curriculum.modules.findIndex((m) => m.id === moduleId);
          if (moduleIdx >= 0) {
            const updatedModule = curriculum.modules[moduleIdx];
            updatedModule.subtopics = generatedSections.map((s, i): Subtopic => ({
              id: `${moduleId}.${i + 1}`,
              title: s.title,
              estimated_minutes: 20, // approximate — sections vary
              key_concepts: [], // concepts are in the plan, not per-subtopic
              teaching_approach: "first-principles", // placeholder — agent decided dynamically
            }));
            updatedModule.generated = true;
            await saveCurriculum(topicRecord.id, curriculum);
          }
        }

        // Send final done event with updated curriculum
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", curriculum })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`
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
