import { ArrowRight, Clock, Layers } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { topics } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NewTopicDialog } from "@/components/home/new-topic-dialog";
import { TopicListShell } from "@/components/home/topic-list-shell";

export const dynamic = "force-dynamic";

function formatTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function HomePage() {
  const allTopics = await db
    .select()
    .from(topics)
    .orderBy(desc(topics.lastSession));

  // Find the best "continue" candidate: most recent with progress but not complete
  const continueTopic = allTopics.find(
    (t) => t.completionPercent > 0 && t.completionPercent < 100
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="group relative">
              <span className="font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Clarity
              </span>
              <span className="font-serif text-xl font-bold tracking-tight text-primary md:text-2xl">
                .
              </span>
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-full" />
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
          <>
            {/* Hero section */}
            <div className="mb-8">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Your Library
              </span>
              <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Continue{" "}
                <span className="text-gradient-primary">Learning</span>
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Pick up where you left off, or start something new.
              </p>
            </div>

            {/* Continue card — elevated hero for in-progress topic */}
            {continueTopic && (
              <Link
                href={`/learn/${continueTopic.slug}`}
                className="group mb-8 flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_10px_40px_-10px_rgba(26,22,20,0.12),0_20px_50px_-10px_rgba(26,22,20,0.06)] transition-all duration-500 hover:border-primary/30 hover:shadow-[0_5px_40px_-10px_rgba(220,38,38,0.15),0_20px_50px_-15px_rgba(26,22,20,0.12)] sm:flex-row sm:items-center sm:p-8"
              >
                {/* Progress ring */}
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="text-xl font-bold text-primary">
                    {Math.round(continueTopic.completionPercent)}%
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Continue where you left off
                  </span>
                  <h3 className="mt-1 font-serif text-lg font-semibold tracking-tight text-card-foreground md:text-xl">
                    {continueTopic.displayName}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="size-3" />
                      {continueTopic.totalModules} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(continueTopic.estimatedMinutes)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-all duration-500"
                      style={{ width: `${continueTopic.completionPercent}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-serif text-sm font-semibold text-primary-foreground transition-all group-hover:gap-3">
                  Continue
                  <ArrowRight className="size-4" />
                </div>
              </Link>
            )}

            {/* Topic grid with filters */}
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
                category: t.category,
              }))}
            />
          </>
        ) : (
          <section className="flex flex-col items-center justify-center py-24">
            <div className="mb-6">
              <span className="font-serif text-5xl font-bold tracking-tight text-foreground">
                C<span className="text-primary">.</span>
              </span>
            </div>
            <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
              Get Started
            </span>
            <h2 className="mb-3 font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Welcome to{" "}
              <span className="text-gradient-primary">Clarity</span>
            </h2>
            <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
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
