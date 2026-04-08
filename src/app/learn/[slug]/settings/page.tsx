"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Save, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TopicSettings {
  id: number;
  slug: string;
  displayName: string;
  level: string;
  goal: string;
  timeCommitment: string;
  sourceType: string;
  totalModules: number;
  learnerIntent?: {
    purpose?: string;
    priorKnowledge?: string;
    desiredDepth?: string;
    timeAvailable?: string;
    focusAreas?: string[];
  } | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [original, setOriginal] = useState<TopicSettings | null>(null);
  const [level, setLevel] = useState("intermediate");
  const [goal, setGoal] = useState("general understanding");
  const [timeCommitment, setTimeCommitment] = useState("standard");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/learn/topics")
      .then((res) => res.json())
      .then((data) => {
        const topic = data.topics?.find(
          (t: Record<string, unknown>) => t.slug === slug
        );
        if (topic) {
          setOriginal({
            id: topic.id,
            slug: topic.slug,
            displayName: topic.displayName,
            level: topic.level,
            goal: topic.goal,
            timeCommitment: topic.timeCommitment ?? "standard",
            sourceType: topic.sourceType ?? "topic_only",
            totalModules: topic.totalModules,
            learnerIntent: topic.learnerIntent ?? null,
          });
          setLevel(topic.level);
          setGoal(topic.goal);
          setTimeCommitment(topic.timeCommitment ?? "standard");
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [slug]);

  const hasChanges =
    original &&
    (level !== original.level ||
      goal !== original.goal ||
      timeCommitment !== original.timeCommitment);

  const handleSave = async () => {
    if (!original || !hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      // Update topic settings
      setPhase("Updating settings...");
      await fetch("/api/learn/source/set-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: original.displayName,
          sourceType: original.sourceType,
          sourcePath: "",
        }),
      });

      // Update level/goal/time via a direct API call
      const res = await fetch("/api/learn/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: original.id,
          level,
          goal,
          timeCommitment,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Regenerate curriculum with new settings
      setPhase("Regenerating curriculum...");
      const currRes = await fetch("/api/learn/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: original.displayName,
          slug,
          level,
          goal,
          timeCommitment,
        }),
      });
      const currData = await currRes.json();
      if (!currData.success) throw new Error(currData.error);

      router.push(`/learn/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSaving(false);
      setPhase(null);
    }
  };

  const handleReviewScope = () => {
    router.push(`/learn/${slug}/scope`);
  };

  const handleDeleteTopic = async () => {
    if (!original || isDeleting) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/learn/topics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: original.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete topic");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!original) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Topic not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 md:px-6 md:py-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push(`/learn/${slug}`)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <BookOpen className="size-5 text-primary" />
          <div>
            <h1 className="font-serif text-lg font-bold text-foreground">
              Settings
            </h1>
            <p className="text-xs text-muted-foreground">
              {original.displayName}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-6">
          {/* Interview Profile (if exists) */}
          {original.learnerIntent && (
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-6">
              <h2 className="mb-4 font-serif text-base font-semibold text-foreground">
                Your Learning Profile
              </h2>
              <div className="space-y-2 text-sm">
                {original.learnerIntent.purpose && (
                  <p><span className="font-medium text-muted-foreground">Purpose:</span> {original.learnerIntent.purpose}</p>
                )}
                {original.learnerIntent.priorKnowledge && (
                  <p><span className="font-medium text-muted-foreground">Background:</span> {original.learnerIntent.priorKnowledge}</p>
                )}
                {original.learnerIntent.desiredDepth && (
                  <p><span className="font-medium text-muted-foreground">Depth:</span> {original.learnerIntent.desiredDepth}</p>
                )}
                {original.learnerIntent.timeAvailable && (
                  <p><span className="font-medium text-muted-foreground">Time:</span> {original.learnerIntent.timeAvailable}</p>
                )}
                {original.learnerIntent.focusAreas && original.learnerIntent.focusAreas.length > 0 && (
                  <p><span className="font-medium text-muted-foreground">Focus:</span> {original.learnerIntent.focusAreas.join(", ")}</p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                This profile was captured during your intake interview and shapes your curriculum and content.
              </p>
            </section>
          )}

          {/* Learning Preferences */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 font-serif text-base font-semibold text-foreground">
              Learning Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">
                  Level
                </label>
                <Select value={level} onValueChange={setLevel} disabled={isSaving}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">
                  Goal
                </label>
                <Select value={goal} onValueChange={setGoal} disabled={isSaving}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general understanding">General Understanding</SelectItem>
                    <SelectItem value="professional development">Professional Development</SelectItem>
                    <SelectItem value="interview preparation">Interview Preparation</SelectItem>
                    <SelectItem value="curiosity">Curiosity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">
                  Time Commitment
                </label>
                <Select
                  value={timeCommitment}
                  onValueChange={setTimeCommitment}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick (~30 min)</SelectItem>
                    <SelectItem value="standard">Standard (2-4 hr)</SelectItem>
                    <SelectItem value="deep">Deep Dive (8+ hr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasChanges && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Changing these settings will regenerate your curriculum.
                  Already-generated content for existing subtopics will be
                  preserved, but module structure may change.
                </p>
              </div>
            )}
          </section>

          {/* Scope (source-based topics only) */}
          {original.sourceType !== "topic_only" && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-2 font-serif text-base font-semibold text-foreground">
                Source Scope
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Review and change which chapters are included in your learning
                path.
              </p>
              <Button variant="outline" onClick={handleReviewScope}>
                Review Scope
              </Button>
            </section>
          )}

          {/* Danger Zone */}
          <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="mb-2 font-serif text-base font-semibold text-destructive">
              Danger Zone
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete this topic and all its content, progress, and chat history. This action cannot be undone.
            </p>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  onClick={handleDeleteTopic}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {isDeleting ? "Deleting..." : "Yes, delete permanently"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                Delete Topic
              </Button>
            )}
          </section>

          {/* Save */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/learn/${slug}`)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {phase}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save & Regenerate
                </>
              )}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}
