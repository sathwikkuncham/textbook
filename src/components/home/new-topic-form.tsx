"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Loader2,
  Upload,
  Link,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { generateSlug } from "@/lib/types/learning";
import type { SourceType } from "@/lib/types/learning";

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

  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [goal, setGoal] = useState("general understanding");
  const [timeCommitment, setTimeCommitment] = useState("standard");
  const [sourceType, setSourceType] = useState<SourceType>("topic_only");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are supported");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("File must be under 50MB");
        return;
      }
      setSourceFile(file);
      setError(null);
      if (!topic.trim()) {
        const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
        setTopic(name);
      }
    }
  };

  const handleStart = async () => {
    if (!topic.trim() || isLoading) return;

    if (sourceType === "pdf" && !sourceFile) {
      setError("Please select a PDF file");
      return;
    }
    if (sourceType === "url" && !sourceUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (sourceType === "pdf" && sourceFile) {
        // Source-based flow: upload → discover → scope review
        setPhase("Uploading PDF...");
        const formData = new FormData();
        formData.append("file", sourceFile);
        formData.append("topic", topic.trim());
        formData.append("level", level);
        formData.append("goal", goal);
        formData.append("timeCommitment", timeCommitment);
        formData.append("sourceType", "pdf");

        const uploadRes = await fetch("/api/learn/source/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error);

        setPhase("Analyzing document structure...");
        const discoverRes = await fetch("/api/learn/source/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim() }),
        });
        const discoverData = await discoverRes.json();
        if (!discoverData.success) throw new Error(discoverData.error);

        const slug = generateSlug(topic.trim());
        router.push(`/learn/${slug}/scope`);
      } else if (sourceType === "url") {
        // URL-based flow: create topic → set URL source → discover → scope review
        setPhase("Setting up topic...");
        const researchRes = await fetch("/api/learn/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            level,
            goal,
            timeCommitment,
          }),
        });
        if (!researchRes.ok) throw new Error("Failed to create topic");

        await fetch("/api/learn/source/set-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            sourceType: "url",
            sourcePath: sourceUrl.trim(),
          }),
        });

        setPhase("Reading URL content...");
        const discoverRes = await fetch("/api/learn/source/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim() }),
        });
        const discoverData = await discoverRes.json();
        if (!discoverData.success) throw new Error(discoverData.error);

        const slug = generateSlug(topic.trim());
        router.push(`/learn/${slug}/scope`);
      } else {
        // Topic-only flow: research → curriculum → learn
        setPhase("Researching topic...");
        const researchRes = await fetch("/api/learn/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            level,
            goal,
            timeCommitment,
          }),
        });
        if (!researchRes.ok) throw new Error("Research failed");

        setPhase("Designing curriculum...");
        const currRes = await fetch("/api/learn/curriculum", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            level,
            goal,
            timeCommitment,
          }),
        });
        const currData = await currRes.json();
        if (!currData.success) throw new Error(currData.error);

        const slug = generateSlug(topic.trim());
        router.push(`/learn/${slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
      setPhase(null);
    }
  };

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
          onKeyDown={(e) =>
            e.key === "Enter" && sourceType === "topic_only" && handleStart()
          }
          placeholder="e.g. Kubernetes, Machine Learning, C Programming..."
          disabled={isLoading}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                  setError(null);
                }}
                disabled={isLoading}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
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
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 overflow-hidden">
              <Upload className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {sourceFile.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(sourceFile.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button
                onClick={() => {
                  setSourceFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              <Upload className="size-5" />
              Click to upload PDF (max 50MB)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {sourceType === "url" && (
        <div>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://docs.example.com/guide"
            disabled={isLoading}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">
            Level
          </label>
          <Select
            value={level}
            onValueChange={setLevel}
            disabled={isLoading}
          >
            <SelectTrigger className="h-9 text-sm">
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
          <label className="mb-1.5 block text-xs text-muted-foreground">
            Goal
          </label>
          <Select value={goal} onValueChange={setGoal} disabled={isLoading}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general understanding">General</SelectItem>
              <SelectItem value="professional development">
                Professional
              </SelectItem>
              <SelectItem value="interview preparation">
                Interview Prep
              </SelectItem>
              <SelectItem value="curiosity">Curiosity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">
            Time
          </label>
          <Select
            value={timeCommitment}
            onValueChange={setTimeCommitment}
            disabled={isLoading}
          >
            <SelectTrigger className="h-9 text-sm">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleStart}
        disabled={!topic.trim() || isLoading}
        className="w-full gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {phase}
          </>
        ) : (
          <>
            <Play className="size-4" />
            {sourceType === "topic_only"
              ? "Start Learning"
              : "Analyze & Review Structure"}
          </>
        )}
      </Button>
    </div>
  );
}
