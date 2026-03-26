import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { db } from "@/lib/db/client";
import { topics, curricula } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface LearnPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function LearnPage({ params }: LearnPageProps) {
  const { slug } = await params;

  // Check if source-based topic needs scope review before learning
  const topicResult = await db
    .select({
      id: topics.id,
      sourceType: topics.sourceType,
    })
    .from(topics)
    .where(eq(topics.slug, slug))
    .limit(1);

  const topic = topicResult[0];

  if (topic && topic.sourceType !== "topic_only") {
    // Check if curriculum exists
    const currResult = await db
      .select({ id: curricula.id })
      .from(curricula)
      .where(eq(curricula.topicId, topic.id))
      .limit(1);

    if (!currResult[0]) {
      // No curriculum yet — redirect to scope review
      redirect(`/learn/${slug}/scope`);
    }
  }

  return <WorkspaceShell topicSlug={slug} />;
}
