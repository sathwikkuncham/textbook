import { NextRequest, NextResponse } from "next/server";
import {
  getCurriculumModifications,
  updateModificationStatus,
  findCurriculumByTopicId,
  saveCurriculum,
  deleteModuleContent,
  updateSubtopicProgress,
} from "@/lib/db/repository";
import type { Curriculum } from "@/lib/types/learning";

// GET — return pending recommendations for a topic
export async function GET(request: NextRequest) {
  const topicId = parseInt(
    request.nextUrl.searchParams.get("topicId") ?? "0",
    10
  );

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  const modifications = await getCurriculumModifications(topicId);
  const pending = modifications.filter((m) => m.status === "pending");

  return NextResponse.json({ success: true, recommendations: pending });
}

// POST — accept or reject a recommendation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, modificationId, action } = body as {
    topicId: number;
    modificationId: string;
    action: "accept" | "reject";
  };

  if (!topicId || !modificationId || !action) {
    return NextResponse.json(
      { error: "topicId, modificationId, and action are required" },
      { status: 400 }
    );
  }

  // Update status
  await updateModificationStatus(
    topicId,
    modificationId,
    action === "accept" ? "accepted" : "rejected"
  );

  // If accepted, apply the modification
  if (action === "accept") {
    const modifications = await getCurriculumModifications(topicId);
    const mod = modifications.find((m) => m.id === modificationId);

    if (mod) {
      const curriculum = await findCurriculumByTopicId(topicId);
      if (curriculum) {
        await applyModification(topicId, curriculum, mod);
      }
    }
  }

  return NextResponse.json({ success: true });
}

async function applyModification(
  topicId: number,
  curriculum: Curriculum,
  mod: {
    type: string;
    targetModuleId: number;
    targetSubtopicId?: string;
    reason: string;
    details: Record<string, unknown>;
  }
) {
  const moduleIdx = curriculum.modules.findIndex(
    (m) => m.id === mod.targetModuleId
  );
  if (moduleIdx < 0) return;

  switch (mod.type) {
    case "add_bridge_subtopic": {
      const module = curriculum.modules[moduleIdx];
      const bridgeId = `${mod.targetModuleId}.${module.subtopics.length + 1}b`;
      const details = mod.details as {
        title?: string;
        keyConcepts?: string[];
        focusArea?: string;
      };

      module.subtopics.push({
        id: bridgeId,
        title: details.title ?? `Bridge: ${details.focusArea ?? "Review"}`,
        estimated_minutes: 15,
        key_concepts: details.keyConcepts ?? [],
        teaching_approach: "example-first",
      });

      await saveCurriculum(topicId, curriculum);
      break;
    }

    case "skip_subtopic": {
      if (mod.targetSubtopicId) {
        await updateSubtopicProgress(
          topicId,
          mod.targetModuleId,
          mod.targetSubtopicId,
          "completed"
        );
      }
      break;
    }

    case "regenerate_content": {
      if (mod.targetSubtopicId) {
        const module = curriculum.modules[moduleIdx];
        const subIdx = module.subtopics.findIndex(
          (s) => s.id === mod.targetSubtopicId
        );
        if (subIdx >= 0) {
          const dbKey = mod.targetModuleId * 100 + subIdx;
          await deleteModuleContent(topicId, dbKey);
        }
      }
      break;
    }

    case "expand_subtopic": {
      const module = curriculum.modules[moduleIdx];
      const details = mod.details as {
        suggestedSubtopics?: Array<{
          title: string;
          keyConcepts?: string[];
        }>;
      };

      if (details.suggestedSubtopics?.length && mod.targetSubtopicId) {
        // Find the position of the current subtopic
        const currentIdx = module.subtopics.findIndex(
          (s) => s.id === mod.targetSubtopicId
        );

        if (currentIdx >= 0) {
          // Insert new subtopics after the current one
          const newSubtopics = details.suggestedSubtopics.map((s, i) => ({
            id: `${mod.targetModuleId}.${currentIdx + 2 + i}`,
            title: s.title,
            estimated_minutes: 30,
            key_concepts: s.keyConcepts ?? [],
            teaching_approach: "first-principles" as const,
          }));

          module.subtopics.splice(currentIdx + 1, 0, ...newSubtopics);

          // Re-number subtopic IDs sequentially
          module.subtopics.forEach((s, idx) => {
            s.id = `${mod.targetModuleId}.${idx + 1}`;
          });

          await saveCurriculum(topicId, curriculum);
        }
      }
      break;
    }

    case "adjust_teaching_approach": {
      if (mod.targetSubtopicId) {
        const module = curriculum.modules[moduleIdx];
        const sub = module.subtopics.find(
          (s) => s.id === mod.targetSubtopicId
        );
        if (sub && mod.details.newApproach) {
          sub.teaching_approach = mod.details.newApproach as
            | "first-principles"
            | "analogy-driven"
            | "example-first"
            | "visual";
          await saveCurriculum(topicId, curriculum);
        }
      }
      break;
    }
  }
}
