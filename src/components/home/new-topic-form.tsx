"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Loader2,
  Upload,
  Link,
  FileText,
  X,
  Send,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/lib/types/learning";
import type { SourceType, LearnerIntentProfile } from "@/lib/types/learning";
import { useInterview } from "@/hooks/use-interview";
import { deriveDisplayLevel, deriveDisplayTimeCommitment } from "@/lib/interview-context";
import { getBrowserSupabase, STORAGE_BUCKET } from "@/lib/supabase/browser";

async function readJsonOrThrow(res: Response, fallback: string): Promise<Record<string, unknown>> {
  if (!res.ok) {
    let message = `${fallback} (HTTP ${res.status})`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const parsed = JSON.parse(text) as { error?: string };
          if (parsed.error) message = parsed.error;
        } catch {
          message = text.length > 200 ? `${text.slice(0, 200)}…` : text;
        }
      }
    } catch {
      // ignore — keep fallback
    }
    throw new Error(message);
  }
  return (await res.json()) as Record<string, unknown>;
}

const SOURCE_TABS: Array<{
  value: SourceType;
  label: string;
  icon: React.ElementType;
}> = [
  { value: "topic_only", label: "Topic Only", icon: FileText },
  { value: "pdf", label: "PDF", icon: Upload },
  { value: "url", label: "URL", icon: Link },
];

export function NewTopicForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("topic_only");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const interview = useInterview(topic.trim() || undefined);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview.messages.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setFormError("Only PDF files are supported");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setFormError("File must be under 50MB");
        return;
      }
      setSourceFile(file);
      setFormError(null);
      if (!topic.trim()) {
        const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
        setTopic(name);
      }
    }
  };

  const handleStartInterview = () => {
    if (!topic.trim()) return;
    if (sourceType === "pdf" && !sourceFile) {
      setFormError("Please select a PDF file");
      return;
    }
    if (sourceType === "url" && !sourceUrl.trim()) {
      setFormError("Please enter a URL");
      return;
    }

    const sourceMeta =
      sourceType === "pdf" && sourceFile
        ? { type: "pdf", name: sourceFile.name }
        : sourceType === "url" && sourceUrl.trim()
          ? { type: "url", url: sourceUrl.trim() }
          : undefined;

    interview.sendMessage(
      `I want to learn about: ${topic.trim()}${sourceType === "pdf" ? ` (from a PDF: ${sourceFile?.name})` : sourceType === "url" ? ` (from URL: ${sourceUrl.trim()})` : ""}`,
      sourceMeta
    );
  };

  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || interview.isLoading) return;
    interview.sendMessage(trimmed);
    setInputValue("");
  };

  const handleConfirmAndStart = async () => {
    if (!interview.profile || isPipelineRunning) return;

    // Capture any last-minute feedback the learner typed in the confirmation
    // panel and append it to the raw transcript before we ship the profile
    // downstream. Agents read the transcript as the canonical context.
    // Build the augmented profile locally — setState is async, so we cannot
    // rely on interview.profile reflecting the append immediately.
    let profileToShip: LearnerIntentProfile = interview.profile;
    if (feedbackValue.trim()) {
      interview.appendLearnerFeedback(feedbackValue);
      profileToShip = {
        ...interview.profile,
        rawTranscript: [
          ...interview.profile.rawTranscript,
          {
            role: "user",
            content: `[Additional context from the learner before we begin] ${feedbackValue.trim()}`,
          },
        ],
      };
      setFeedbackValue("");
    }

    setIsPipelineRunning(true);
    setFormError(null);
    const derivedLevel = deriveDisplayLevel(profileToShip);
    const derivedTimeCommitment = deriveDisplayTimeCommitment(profileToShip);
    const topicName = topic.trim();
    const goal = profileToShip.purpose || "general understanding";

    // Check if topic already exists (retry scenario)
    const slug = generateSlug(topicName);
    let existingState: { pipelinePhase?: string; hasResearch?: boolean; hasCurriculum?: boolean; hasSourceStructure?: boolean } | null = null;
    try {
      const stateRes = await fetch(`/api/learn/topic-state?slug=${slug}`);
      if (stateRes.ok) existingState = await stateRes.json();
    } catch {
      // Topic doesn't exist yet — normal first-time flow
    }

    try {
      if (sourceType === "pdf" && sourceFile) {
        // PDF flow: signed-url → direct browser upload to Supabase →
        // finalize topic row → save interview → discover → scope page.
        // Bytes never traverse our serverless function, so the platform body
        // size limit doesn't apply.
        let pdfSlug = slug;

        if (!existingState?.hasSourceStructure) {
          if (!existingState) {
            setPipelinePhase("Preparing upload...");
            const signedRes = await fetch("/api/learn/source/signed-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic: topicName,
                fileName: sourceFile.name,
                level: derivedLevel,
                goal,
              }),
            });
            const signedData = await readJsonOrThrow(signedRes, "Failed to prepare upload");
            const {
              token,
              path,
              topicSlug: derivedTopicSlug,
              displayName,
              category,
            } = signedData as {
              token: string;
              path: string;
              topicSlug: string;
              displayName: string;
              category?: string;
            };

            setPipelinePhase("Uploading PDF...");
            const supabaseBrowser = getBrowserSupabase();
            const { error: uploadErr } = await supabaseBrowser.storage
              .from(STORAGE_BUCKET)
              .uploadToSignedUrl(path, token, sourceFile, {
                contentType: sourceFile.type || "application/pdf",
              });
            if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

            const finalizeRes = await fetch("/api/learn/source/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic: topicName,
                topicSlug: derivedTopicSlug,
                displayName,
                level: derivedLevel,
                goal,
                timeCommitment: derivedTimeCommitment,
                sourceType: "pdf",
                storagePath: path,
                fileName: sourceFile.name,
                fileSize: sourceFile.size,
                category,
              }),
            });
            const finalizeData = await readJsonOrThrow(finalizeRes, "Failed to finalize upload");
            if (!finalizeData.success) throw new Error((finalizeData.error as string) ?? "Failed to finalize upload");
            pdfSlug = finalizeData.topicSlug as string;

            await fetch("/api/learn/interview", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topicId: finalizeData.topicId,
                profile: profileToShip,
              }),
            });
          }

          setPipelinePhase("Analyzing document structure...");
          const discoverRes = await fetch("/api/learn/source/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: topicName, slug: pdfSlug }),
          });
          const discoverData = await readJsonOrThrow(discoverRes, "Failed to analyze document");
          if (!discoverData.success) throw new Error((discoverData.error as string) ?? "Failed to analyze document");
        }

        router.push(`/learn/${pdfSlug}/scope`);
      } else if (sourceType === "url") {
        // URL flow: research → set-source → discover → scope page
        let derivedSlug = slug;

        if (!existingState?.hasResearch) {
          setPipelinePhase("Setting up topic...");
          const researchRes = await fetch("/api/learn/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: topicName,
              level: derivedLevel,
              goal,
              timeCommitment: derivedTimeCommitment,
              learnerIntent: profileToShip,
            }),
          });
          if (!researchRes.ok) throw new Error("Failed to create topic");
          const researchData = await researchRes.json();
          derivedSlug = researchData.topicSlug;

          const setSourceRes = await fetch("/api/learn/source/set-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: topicName,
              slug: derivedSlug,
              sourceType: "url",
              sourcePath: sourceUrl.trim(),
            }),
          });
          const setSourceData = await setSourceRes.json();
          if (!setSourceData.success) throw new Error(setSourceData.error ?? "Failed to set source");
        }

        if (!existingState?.hasSourceStructure) {
          setPipelinePhase("Reading URL content...");
          const discoverRes = await fetch("/api/learn/source/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: topicName, slug: derivedSlug }),
          });
          const discoverData = await discoverRes.json();
          if (!discoverData.success) throw new Error(discoverData.error);
        }

        router.push(`/learn/${derivedSlug}/scope`);
      } else {
        // Topic-only flow: research → curriculum → learning page
        let topicSlug = slug;

        if (!existingState?.hasResearch) {
          setPipelinePhase("Researching topic...");
        } else {
          setPipelinePhase("Resuming...");
        }

        const researchRes = await fetch("/api/learn/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topicName,
            level: derivedLevel,
            goal,
            timeCommitment: derivedTimeCommitment,
            learnerIntent: interview.profile,
          }),
        });
        if (!researchRes.ok) throw new Error("Research failed");
        const researchData = await researchRes.json();
        topicSlug = researchData.topicSlug;

        if (!existingState?.hasCurriculum) {
          setPipelinePhase("Designing curriculum...");
        }

        const currRes = await fetch("/api/learn/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topicName,
            slug: topicSlug,
            level: derivedLevel,
            goal,
            timeCommitment: derivedTimeCommitment,
          }),
        });
        const currData = await currRes.json();
        if (!currData.success) throw new Error(currData.error);

        router.push(`/learn/${topicSlug}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
      setIsPipelineRunning(false);
      setPipelinePhase(null);
    }
  };

  // Phase: Initial input
  if (interview.phase === "idle") {
    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">
            What do you want to learn?
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStartInterview()}
            placeholder="e.g. Kubernetes, a research paper, DDIA textbook..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">
            Source Material
          </label>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {SOURCE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = sourceType === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSourceType(tab.value);
                    setFormError(null);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {sourceType === "pdf" && (
          <div>
            {sourceFile ? (
              <div className="flex items-center gap-2 overflow-hidden rounded-md border border-border bg-muted/50 px-3 py-2">
                <Upload className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{sourceFile.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(sourceFile.size / 1024 / 1024).toFixed(1)}MB
                </span>
                <button onClick={() => { setSourceFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="rounded p-0.5 hover:bg-muted">
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Upload className="size-5" />
                Click to upload PDF (max 50MB)
              </button>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
          </div>
        )}

        {sourceType === "url" && (
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://docs.example.com/guide"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <Button onClick={handleStartInterview} disabled={!topic.trim()} className="w-full gap-2">
          <Play className="size-4" />
          Continue
        </Button>
      </div>
    );
  }

  // Phase: Interview conversation
  if (interview.phase === "active" || interview.phase === "confirming") {
    return (
      <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "60vh" }}>
        {/* Messages */}
        <div className="shrink-0 space-y-3 px-1 py-2">
          {interview.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {interview.isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3 py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Profile confirmation card */}
        {interview.phase === "confirming" && interview.profile && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your Learning Profile
            </p>
            <div className="space-y-1 text-sm">
              {interview.profile.purpose && (
                <p><span className="text-muted-foreground">Purpose:</span> {interview.profile.purpose}</p>
              )}
              {interview.profile.priorKnowledge && (
                <p><span className="text-muted-foreground">Background:</span> {interview.profile.priorKnowledge}</p>
              )}
              {interview.profile.desiredDepth && (
                <p><span className="text-muted-foreground">Depth:</span> {interview.profile.desiredDepth}</p>
              )}
              {interview.profile.timeAvailable && (
                <p><span className="text-muted-foreground">Time:</span> {interview.profile.timeAvailable}</p>
              )}
              {interview.profile.focusAreas.length > 0 && (
                <p><span className="text-muted-foreground">Focus:</span> {interview.profile.focusAreas.join(", ")}</p>
              )}
            </div>
            <div className="mt-3">
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Anything to add or correct before we begin? (optional)
              </label>
              <textarea
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
                placeholder="e.g. something I struggled with last time, a specific angle I care about, constraints I forgot to mention…"
                rows={3}
                disabled={isPipelineRunning}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={handleConfirmAndStart} disabled={isPipelineRunning} className="flex-1 gap-2" size="sm">
                {isPipelineRunning ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {pipelinePhase}
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Start Learning
                  </>
                )}
              </Button>
              <Button onClick={interview.reset} variant="outline" size="sm" disabled={isPipelineRunning}>
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
            {formError && <p className="mt-2 text-xs text-destructive">{formError}</p>}
          </div>
        )}

        {/* Input (only if not confirming) */}
        {interview.phase === "active" && (
          <div className="mt-3 flex items-end gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your answer..."
              disabled={interview.isLoading}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || interview.isLoading} size="sm" className="h-9 px-3">
              <Send className="size-3.5" />
            </Button>
          </div>
        )}

        {interview.error && (
          <p className="mt-2 text-sm text-destructive">{interview.error}</p>
        )}
      </div>
    );
  }

  return null;
}
