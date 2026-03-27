import { BookOpen } from "lucide-react";
import { db } from "@/lib/db/client";
import { topics } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NewTopicDialog } from "@/components/home/new-topic-dialog";
import { TopicListShell } from "@/components/home/topic-list-shell";
import { SearchTrigger } from "@/components/home/search-trigger";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const allTopics = await db
    .select()
    .from(topics)
    .orderBy(desc(topics.lastSession));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <BookOpen className="size-5 text-primary md:size-6" />
            <h1 className="font-serif text-lg font-bold text-foreground md:text-xl">
              Textbook
            </h1>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Deep learning on any topic, powered by AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NewTopicDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {allTopics.length > 0 ? (
          <TopicListShell
            topics={allTopics.map((t) => ({
              slug: t.slug,
              displayName: t.displayName,
              level: t.level,
              goal: t.goal,
              totalModules: t.totalModules,
              estimatedMinutes: t.estimatedMinutes,
              completionPercent: t.completionPercent,
              lastSession: t.lastSession.toISOString(),
              sourceType: t.sourceType,
            }))}
          />
        ) : (
          <section className="flex flex-col items-center justify-center py-20">
            <BookOpen className="mb-4 size-16 text-muted-foreground/20" />
            <h2 className="mb-2 font-serif text-2xl font-semibold text-foreground">
              Welcome to Textbook
            </h2>
            <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
              AI agents will research any topic, design a curriculum, and
              create rich teaching content — personalized to your level and
              goals.
            </p>
            <NewTopicDialog />
          </section>
        )}
      </main>
    </div>
  );
}
