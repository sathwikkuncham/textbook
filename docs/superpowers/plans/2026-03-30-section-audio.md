# Section-Based Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broken paragraph-level audio with per-section TTS narration that skips "Visualizing It", caches per-section WAV files, plays them sequentially, and highlights the active section without re-rendering MermaidDiagrams.

**Architecture:** Content is split by `### N.` headers into known sections. Each section (except "Visualizing It") gets its own Gemini TTS call, WAV file, and Supabase storage entry. The hook manages sequential playback across section Audio elements. The renderer splits markdown by section headers and wraps each in a memoized component so only the wrapper's className changes during playback.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, Supabase Storage, Gemini TTS (`gemini-2.5-flash-preview-tts`), `@google/genai` SDK

---

### Task 1: Rewrite `generate.ts` — section extraction + cleanup

**Files:**
- Modify: `src/lib/tts/generate.ts`

- [ ] **Step 1: Replace `extractParagraphs` and `estimateParagraphTimings` with `extractSections`**

Replace the entire file with:

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

export interface SectionAudio {
  index: number;
  title: string;
  audioUrl: string;
}

export interface ContentSection {
  index: number;
  title: string;
  text: string;
}

const SKIP_SECTIONS = ["Visualizing It"];

function stripMarkdown(text: string): string {
  let t = text;
  // Remove code blocks (backtick and tilde fences)
  t = t.replace(/```[\s\S]*?```/g, "");
  t = t.replace(/~~~[\s\S]*?~~~/g, "");
  // Remove inline code
  t = t.replace(/`[^`]+`/g, "");
  // Remove images
  t = t.replace(/!\[.*?\]\(.*?\)/g, "");
  // Remove links but keep text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove HTML tags
  t = t.replace(/<[^>]+>/g, "");
  // Remove horizontal rules
  t = t.replace(/^---+$/gm, "");
  // Remove table formatting
  t = t.replace(/\|.*\|/g, "");
  // Remove markdown formatting (bold, italic)
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/\*(.*?)\*/g, "$1");
  // Remove list markers
  t = t.replace(/^\s*[-*+]\s+/gm, "");
  t = t.replace(/^\s*\d+\.\s+/gm, "");
  // Remove sub-headers within the section (#### and below)
  t = t.replace(/^#{4,6}\s+.*$/gm, "");
  // Collapse whitespace
  return t
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 10)
    .join("\n\n");
}

export function extractSections(markdown: string): ContentSection[] {
  // Split on ### N. headers (e.g., "### 1. Why This Matters")
  const sectionRegex = /^###\s+(\d+)\.\s+(.+)$/gm;
  const splits: { index: number; title: string; start: number }[] = [];

  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    splits.push({
      index: parseInt(match[1], 10) - 1, // 0-based: "### 1." -> index 0
      title: match[2].trim(),
      start: match.index + match[0].length,
    });
  }

  if (splits.length === 0) return [];

  const sections: ContentSection[] = [];
  for (let i = 0; i < splits.length; i++) {
    const { index, title, start } = splits[i];
    const end = i + 1 < splits.length ? splits[i + 1].start - splits[i + 1].title.length - 10 : markdown.length;
    const rawBody = markdown.slice(start, end).trim();

    if (SKIP_SECTIONS.some((s) => title.includes(s))) continue;

    const text = stripMarkdown(rawBody);
    if (text.length > 10) {
      sections.push({ index, title, text });
    }
  }

  return sections;
}

/** Wrap raw PCM 16-bit LE mono data in a WAV container */
function createWavBuffer(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;

  const wav = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);

  // fmt chunk
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcm.copy(wav, headerSize);

  return wav;
}

export async function generateAudio(text: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this educational content in a calm, clear, well-paced teaching voice:\n\n${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData?.data) {
    throw new Error("No audio data in TTS response");
  }

  const rawPcm = Buffer.from(inlineData.data, "base64");
  const responseMime = inlineData.mimeType || "audio/L16;rate=24000";

  const rateMatch = responseMime.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  const wavBuffer = createWavBuffer(rawPcm, sampleRate);

  return {
    buffer: wavBuffer,
    mimeType: "audio/wav",
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `generate.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/tts/generate.ts
git commit -m "refactor: replace paragraph extraction with section-based extraction for TTS"
```

---

### Task 2: Rewrite API route for per-section audio generation

**Files:**
- Modify: `src/app/api/learn/audio/route.ts`

- [ ] **Step 1: Rewrite the route to generate per-section audio in parallel**

Replace the entire file with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { findAudio, findModuleContent, saveAudio } from "@/lib/db/repository";
import { extractSections, generateAudio } from "@/lib/tts/generate";
import type { SectionAudio } from "@/lib/tts/generate";
import { supabase } from "@/lib/supabase/client";

const AUDIO_BUCKET = "audio-content";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const topicIdParam = searchParams.get("topicId");
  const moduleIdParam = searchParams.get("moduleId");

  if (!topicIdParam || !moduleIdParam) {
    return NextResponse.json(
      { error: "topicId and moduleId are required" },
      { status: 400 }
    );
  }

  const topicId = parseInt(topicIdParam, 10);
  const moduleId = parseInt(moduleIdParam, 10);

  if (isNaN(topicId) || isNaN(moduleId)) {
    return NextResponse.json(
      { error: "topicId and moduleId must be valid numbers" },
      { status: 400 }
    );
  }

  try {
    // Check DB for cached section audio
    const cached = await findAudio(topicId, moduleId);
    if (cached?.audioUrl && Array.isArray(cached.paragraphTimings) && cached.paragraphTimings.length > 0) {
      return NextResponse.json({
        sections: cached.paragraphTimings as SectionAudio[],
      });
    }

    // Fetch the content to generate audio from
    const content = await findModuleContent(topicId, moduleId);
    if (!content) {
      return NextResponse.json(
        { error: "Module content not found. Load the content first." },
        { status: 404 }
      );
    }

    // Extract sections (skips "Visualizing It")
    const contentSections = extractSections(content.content);
    if (contentSections.length === 0) {
      return NextResponse.json(
        { error: "No readable sections found in content" },
        { status: 400 }
      );
    }

    // Generate audio for all sections in parallel
    const audioResults = await Promise.all(
      contentSections.map(async (section) => {
        const { buffer } = await generateAudio(section.text);
        const storagePath = `audio/${topicId}/${moduleId}/section-${section.index}.wav`;

        const { error: uploadError } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(storagePath, buffer, {
            contentType: "audio/wav",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed for section ${section.index}: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(AUDIO_BUCKET)
          .getPublicUrl(storagePath);

        return {
          index: section.index,
          title: section.title,
          audioUrl: urlData.publicUrl,
        } satisfies SectionAudio;
      })
    );

    // Save to DB
    await saveAudio(topicId, moduleId, "sections", audioResults);

    return NextResponse.json({ sections: audioResults });
  } catch (error) {
    console.error("[audio-api] Generation failed:", error);
    const message = error instanceof Error ? error.message : "Audio generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `route.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/learn/audio/route.ts
git commit -m "feat: per-section parallel audio generation with Visualizing It skipped"
```

---

### Task 3: Rewrite `use-audio-player.ts` for sequential section playback

**Files:**
- Modify: `src/hooks/use-audio-player.ts`

- [ ] **Step 1: Rewrite the hook for section-based sequential playback**

Replace the entire file with:

```ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SectionAudio } from "@/lib/tts/generate";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentSectionIndex: number;
  progress: number;
  duration: number;
  currentTime: number;
  hasAudio: boolean;
}

interface SectionDuration {
  index: number;
  duration: number;
  cumulativeStart: number;
}

export function useAudioPlayer(topicId: number | null, moduleId: number | null) {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    currentSectionIndex: -1,
    progress: 0,
    duration: 0,
    currentTime: 0,
    hasAudio: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sectionsRef = useRef<SectionAudio[]>([]);
  const sectionDurationsRef = useRef<SectionDuration[]>([]);
  const currentSectionIdxRef = useRef<number>(-1);
  const activeKeyRef = useRef<string | null>(null);
  const isAdvancingRef = useRef(false);

  const destroyAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    destroyAudio();
    sectionsRef.current = [];
    sectionDurationsRef.current = [];
    currentSectionIdxRef.current = -1;
    isAdvancingRef.current = false;
    setState({
      isPlaying: false,
      isLoading: false,
      currentSectionIndex: -1,
      progress: 0,
      duration: 0,
      currentTime: 0,
      hasAudio: false,
    });
  }, [destroyAudio]);

  // Reset when topicId or moduleId changes
  useEffect(() => {
    const key = topicId !== null && moduleId !== null ? `${topicId}-${moduleId}` : null;
    if (activeKeyRef.current !== key) {
      cleanup();
      activeKeyRef.current = key;
    }
  }, [topicId, moduleId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, []);

  const computeOverallTime = useCallback((sectionArrayIdx: number, sectionCurrentTime: number): { currentTime: number; progress: number } => {
    const durations = sectionDurationsRef.current;
    if (durations.length === 0) return { currentTime: 0, progress: 0 };

    const totalDuration = durations.reduce((sum, d) => sum + d.duration, 0);
    if (totalDuration === 0) return { currentTime: 0, progress: 0 };

    const sectionDur = durations[sectionArrayIdx];
    if (!sectionDur) return { currentTime: 0, progress: 0 };

    const currentTime = sectionDur.cumulativeStart + sectionCurrentTime;
    const progress = (currentTime / totalDuration) * 100;
    return { currentTime, progress };
  }, []);

  const playSection = useCallback(async (sectionArrayIdx: number) => {
    const sections = sectionsRef.current;
    if (sectionArrayIdx >= sections.length) {
      // All sections finished
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentSectionIndex: -1,
        progress: 100,
      }));
      isAdvancingRef.current = false;
      return;
    }

    destroyAudio();
    currentSectionIdxRef.current = sectionArrayIdx;

    const section = sections[sectionArrayIdx];
    const audio = new Audio(section.audioUrl);
    audioRef.current = audio;

    setState((prev) => ({
      ...prev,
      currentSectionIndex: section.index,
      isPlaying: true,
    }));

    audio.addEventListener("loadedmetadata", () => {
      const durations = sectionDurationsRef.current;
      if (durations[sectionArrayIdx]) {
        durations[sectionArrayIdx].duration = audio.duration;
        // Recompute cumulative starts
        let cumulative = 0;
        for (const d of durations) {
          d.cumulativeStart = cumulative;
          cumulative += d.duration;
        }
        setState((prev) => ({
          ...prev,
          duration: cumulative,
          hasAudio: true,
        }));
      }
    });

    audio.addEventListener("timeupdate", () => {
      const { currentTime, progress } = computeOverallTime(sectionArrayIdx, audio.currentTime);
      setState((prev) => ({
        ...prev,
        currentTime,
        progress,
      }));
    });

    audio.addEventListener("ended", () => {
      if (!isAdvancingRef.current) {
        isAdvancingRef.current = true;
        playSection(sectionArrayIdx + 1).finally(() => {
          isAdvancingRef.current = false;
        });
      }
    });

    audio.addEventListener("error", () => {
      // Skip failed section, try next
      if (!isAdvancingRef.current) {
        isAdvancingRef.current = true;
        playSection(sectionArrayIdx + 1).finally(() => {
          isAdvancingRef.current = false;
        });
      }
    });

    try {
      await audio.play();
    } catch {
      // Autoplay blocked — skip to next
      if (!isAdvancingRef.current) {
        isAdvancingRef.current = true;
        playSection(sectionArrayIdx + 1).finally(() => {
          isAdvancingRef.current = false;
        });
      }
    }
  }, [destroyAudio, computeOverallTime]);

  const play = useCallback(async () => {
    if (topicId === null || moduleId === null) return;

    // If already loaded, resume current section
    if (audioRef.current && sectionsRef.current.length > 0) {
      try {
        await audioRef.current.play();
        const section = sectionsRef.current[currentSectionIdxRef.current];
        setState((prev) => ({
          ...prev,
          isPlaying: true,
          currentSectionIndex: section?.index ?? -1,
        }));
        return;
      } catch {
        // Fall through to re-fetch
      }
    }

    // Fetch sections from API
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch(`/api/learn/audio?topicId=${topicId}&moduleId=${moduleId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch audio");
      }

      const sections: SectionAudio[] = data.sections;
      if (!sections || sections.length === 0) {
        throw new Error("No audio sections returned");
      }

      sectionsRef.current = sections;

      // Initialize duration tracking (durations filled in as each section loads metadata)
      sectionDurationsRef.current = sections.map((s) => ({
        index: s.index,
        duration: 0,
        cumulativeStart: 0,
      }));

      setState((prev) => ({ ...prev, isLoading: false, hasAudio: true }));

      // Start playing from first section
      await playSection(0);
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [topicId, moduleId, playSection]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, pause, play]);

  return {
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    currentSectionIndex: state.currentSectionIndex,
    progress: state.progress,
    duration: state.duration,
    currentTime: state.currentTime,
    hasAudio: state.hasAudio,
    play,
    pause,
    toggle,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `use-audio-player.ts`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-audio-player.ts
git commit -m "feat: rewrite audio hook for sequential section playback"
```

---

### Task 4: Update `main-content.tsx` — section-split rendering with memoization

**Files:**
- Modify: `src/components/layout/main-content.tsx`

- [ ] **Step 1: Add section-splitting utility and memoized section component**

At the top of the file, add the `React.memo` import and add the section splitter + memoized component. Then update `MainContentProps`, the `MainContent` component, and replace `MarkdownRenderer`.

Replace the entire file with:

```tsx
"use client";

import React, { useRef, useMemo, memo } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { TextSelectionToolbar } from "@/components/chat/text-selection-toolbar";
import { AudioPlayButton, AudioProgressBar } from "@/components/ui/audio-player";
import type { LearningPhase } from "@/hooks/use-learning-state";
import type { Curriculum } from "@/lib/types/learning";
import type { useAudioPlayer } from "@/hooks/use-audio-player";

// ── Section splitting ──────────────────────────────────────

interface ContentSection {
  index: number;
  title: string;
  body: string;
}

function splitContentSections(markdown: string): { preamble: string; sections: ContentSection[] } {
  const sectionRegex = /^(###\s+(\d+)\.\s+(.+))$/gm;
  const splits: { index: number; title: string; headerLine: string; start: number }[] = [];

  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    splits.push({
      index: parseInt(match[2], 10) - 1,
      title: match[3].trim(),
      headerLine: match[1],
      start: match.index,
    });
  }

  if (splits.length === 0) {
    return { preamble: markdown, sections: [] };
  }

  const preamble = markdown.slice(0, splits[0].start).trim();
  const sections: ContentSection[] = splits.map((split, i) => {
    const bodyStart = split.start + split.headerLine.length;
    const bodyEnd = i + 1 < splits.length ? splits[i + 1].start : markdown.length;
    return {
      index: split.index,
      title: split.title,
      body: markdown.slice(bodyStart, bodyEnd).trim(),
    };
  });

  return { preamble, sections };
}

// ── Markdown component map (shared) ────────────────────────

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-6 border-b border-border pb-3 font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-4 mt-10 border-b border-border/50 pb-2 font-serif text-lg font-semibold tracking-tight text-foreground md:text-xl">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => {
    const text = String(children);
    const isSectionHeader =
      /^\d+\.\s/.test(text) ||
      [
        "Why This Matters",
        "Core Idea",
        "Visualizing It",
        "Real-World Analogy",
        "Concrete Example",
        "Common Pitfalls",
        "Key Takeaway",
      ].some((s) => text.includes(s));

    if (isSectionHeader) {
      return (
        <h3 className="mb-3 mt-6 text-base font-semibold text-primary">
          {children}
        </h3>
      );
    }
    return (
      <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">
        {children}
      </h3>
    );
  },
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 leading-relaxed text-foreground/90">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-foreground/90">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-foreground/90">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-7">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isMermaid = className?.includes("language-mermaid");
    if (isMermaid) {
      const chart = String(children).trim();
      return <MermaidDiagram chart={chart} />;
    }

    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block whitespace-pre font-mono text-[13px] leading-[1.45] text-foreground">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => {
    const child = children as React.ReactElement<{ className?: string }>;
    if (child?.props?.className?.includes("language-mermaid")) {
      return <>{children}</>;
    }
    return (
      <pre className="mb-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-[13px] leading-[1.45]">
        {children}
      </pre>
    );
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="border-b border-border bg-muted/50">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b border-border/30 px-3 py-2 text-foreground/90">{children}</td>
  ),
  hr: () => <hr className="my-8 border-border" />,
};

// ── Memoized section body ──────────────────────────────────
// This prevents ReactMarkdown (and MermaidDiagram) from re-rendering
// when only the active section highlight changes.

const MemoizedSectionBody = memo(function MemoizedSectionBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {markdown}
    </ReactMarkdown>
  );
});

// ── Sub-components ─────────────────────────────────────────

interface SubtopicNavInfo {
  moduleId: number;
  subtopicId: string;
  moduleTitle: string;
  subtopicTitle: string;
}

interface MainContentProps {
  phase: LearningPhase;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  activeModuleTitle?: string;
  onTextSelectionAction?: (action: string, selectedText: string) => void;
  quizContent?: React.ReactNode;
  curriculum?: Curriculum | null;
  activeModuleId?: number | null;
  activeSubtopicId?: string | null;
  onNavigateSubtopic?: (moduleId: number, subtopicId: string) => void;
  activeSectionIndex?: number | null;
  audioPlayer?: ReturnType<typeof useAudioPlayer>;
}

function ContentSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">
      <div className="mb-6 border-b border-border pb-3">
        <div className="h-7 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-3 mt-10 h-6 w-2/5 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 h-32 w-full animate-pulse rounded-lg border border-border bg-muted/50" />
      <div className="mb-3 mt-8 h-5 w-1/3 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function ReadyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <BookOpen className="mb-4 size-16 text-muted-foreground/20" />
      <p className="text-lg text-muted-foreground">
        Select a subtopic to start reading
      </p>
      <p className="mt-2 text-sm text-muted-foreground/60">
        Click any subtopic in the sidebar
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-sm font-medium text-destructive">Error</p>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error}
      </p>
    </div>
  );
}

function useSubtopicNav(
  curriculum: Curriculum | null | undefined,
  activeModuleId: number | null | undefined,
  activeSubtopicId: string | null | undefined
): { prev: SubtopicNavInfo | null; next: SubtopicNavInfo | null; current: string | null } {
  return useMemo(() => {
    if (!curriculum || !activeModuleId || !activeSubtopicId) {
      return { prev: null, next: null, current: null };
    }

    const flat: SubtopicNavInfo[] = [];
    for (const mod of curriculum.modules) {
      for (const sub of mod.subtopics) {
        flat.push({
          moduleId: mod.id,
          subtopicId: sub.id,
          moduleTitle: mod.title,
          subtopicTitle: sub.title,
        });
      }
    }

    const currentIdx = flat.findIndex(
      (s) => s.moduleId === activeModuleId && s.subtopicId === activeSubtopicId
    );

    const currentLabel = currentIdx >= 0 ? `${flat[currentIdx].moduleTitle}` : null;

    return {
      prev: currentIdx > 0 ? flat[currentIdx - 1] : null,
      next: currentIdx >= 0 && currentIdx < flat.length - 1 ? flat[currentIdx + 1] : null,
      current: currentLabel,
    };
  }, [curriculum, activeModuleId, activeSubtopicId]);
}

function SubtopicNavBar({
  prev,
  next,
  onNavigate,
}: {
  prev: SubtopicNavInfo | null;
  next: SubtopicNavInfo | null;
  onNavigate: (moduleId: number, subtopicId: string) => void;
}) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-10 flex items-stretch gap-3 border-t border-border pt-6">
      {prev ? (
        <button
          onClick={() => onNavigate(prev.moduleId, prev.subtopicId)}
          className="group flex flex-1 flex-col items-start gap-1 rounded-xl border border-border bg-card p-4 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-glow-red)]"
        >
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <ChevronLeft className="size-3" />
            Previous
          </span>
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {prev.subtopicTitle}
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <button
          onClick={() => onNavigate(next.moduleId, next.subtopicId)}
          className="group flex flex-1 flex-col items-end gap-1 rounded-xl border border-border bg-card p-4 text-right transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-glow-red)]"
        >
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Next
            <ChevronRight className="size-3" />
          </span>
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {next.subtopicTitle}
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}

// ── Main component ─────────────────────────────────────────

export function MainContent({
  phase,
  content,
  isLoading,
  error,
  activeModuleTitle,
  onTextSelectionAction,
  quizContent,
  curriculum,
  activeModuleId,
  activeSubtopicId,
  onNavigateSubtopic,
  activeSectionIndex,
  audioPlayer,
}: MainContentProps) {
  const articleRef = useRef<HTMLElement>(null);
  const { prev, next } = useSubtopicNav(curriculum, activeModuleId, activeSubtopicId);

  const { preamble, sections } = useMemo(
    () => (content ? splitContentSections(content) : { preamble: "", sections: [] }),
    [content]
  );

  if (error) return <ErrorState error={error} />;

  if (quizContent) {
    return (
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">{quizContent}</div>
      </ScrollArea>
    );
  }

  if (isLoading && !content) {
    return <ContentSkeleton />;
  }

  if (!content) return <ReadyState />;

  return (
    <ScrollArea className="h-full">
      {onTextSelectionAction && (
        <TextSelectionToolbar
          articleRef={articleRef}
          onAction={(action, text) => onTextSelectionAction(action, text)}
        />
      )}
      <article ref={articleRef} className="mx-auto max-w-4xl px-4 py-4 md:px-8 md:py-6">
        {/* Audio listen button */}
        {audioPlayer && (
          <div className="mb-4 flex items-center justify-end">
            <AudioPlayButton
              isPlaying={audioPlayer.isPlaying}
              isLoading={audioPlayer.isLoading}
              onToggle={audioPlayer.toggle}
            />
          </div>
        )}

        {/* Audio progress bar */}
        {audioPlayer && (audioPlayer.isPlaying || audioPlayer.duration > 0) && (
          <AudioProgressBar
            isPlaying={audioPlayer.isPlaying}
            isLoading={audioPlayer.isLoading}
            hasAudio={audioPlayer.hasAudio}
            progress={audioPlayer.progress}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            onToggle={audioPlayer.toggle}
          />
        )}

        {/* Preamble (h1/h2 title before sections) */}
        {preamble && <MemoizedSectionBody markdown={preamble} />}

        {/* Section-based rendering */}
        {sections.map((section) => (
          <div
            key={section.index}
            className={cn(
              "transition-all duration-500",
              activeSectionIndex === section.index &&
                "rounded-r-lg border-l-2 border-primary bg-primary/5 -ml-4 pl-4"
            )}
          >
            <h3 className="mb-3 mt-6 text-base font-semibold text-primary">
              {section.index + 1}. {section.title}
            </h3>
            <MemoizedSectionBody markdown={section.body} />
          </div>
        ))}

        {/* Fallback: render as single block if no sections detected */}
        {sections.length === 0 && content && <MemoizedSectionBody markdown={content} />}

        {/* Prev / Next navigation */}
        {onNavigateSubtopic && (
          <SubtopicNavBar prev={prev} next={next} onNavigate={onNavigateSubtopic} />
        )}
      </article>
    </ScrollArea>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/main-content.tsx
git commit -m "feat: section-split rendering with memoized sections to prevent mermaid shutter"
```

---

### Task 5: Update `panel-layout.tsx` — wire section index

**Files:**
- Modify: `src/components/layout/panel-layout.tsx`

- [ ] **Step 1: Replace `activeParagraphIndex` with `activeSectionIndex`**

In `panel-layout.tsx`, find the `MainContent` usage (around line 117-128) and change the prop:

Find:
```tsx
          activeParagraphIndex={audioPlayer.isPlaying ? audioPlayer.currentParagraphIndex : null}
```

Replace with:
```tsx
          activeSectionIndex={audioPlayer.isPlaying ? audioPlayer.currentSectionIndex : null}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/panel-layout.tsx
git commit -m "feat: pass section index instead of paragraph index for audio highlighting"
```

---

### Task 6: Update `audio-player.tsx` — remove unused `hasAudio` prop

**Files:**
- Modify: `src/components/ui/audio-player.tsx`

- [ ] **Step 1: Clean up the interface**

No functional changes needed. The `AudioProgressBar` component already receives `progress`, `currentTime`, `duration` from the hook — these now represent overall progress across all sections. The component works as-is.

Verify the file compiles correctly with the new hook return types.

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 2: Commit (only if changes were needed)**

```bash
git add src/components/ui/audio-player.tsx
git commit -m "chore: verify audio player component works with section-based hook"
```

---

### Task 7: Manual end-to-end test

- [ ] **Step 1: Clear old corrupt audio cache**

Run this SQL against your Supabase DB to clear any old corrupt audio entries:

```sql
UPDATE module_content
SET audio_url = NULL, paragraph_timings = NULL
WHERE audio_url IS NOT NULL;
```

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`

- [ ] **Step 3: Test audio generation**

1. Navigate to any topic with generated content
2. Click "Listen" button
3. Verify: loading state shows "Generating..."
4. Verify: audio plays clearly (not noise)
5. Verify: progress bar appears and advances
6. Verify: section highlighting moves to the correct `### N.` section
7. Verify: "Visualizing It" section is NOT highlighted (skipped in audio)
8. Verify: mermaid diagrams do NOT flash/shutter during playback

- [ ] **Step 4: Test caching**

1. After audio finishes, click "Listen" again
2. Verify: audio starts almost instantly (no 3-minute wait)
3. Verify: no new TTS API calls in server console

- [ ] **Step 5: Test section transitions**

1. Listen through the end of one section
2. Verify: next section auto-starts seamlessly
3. Verify: section highlight moves to the next section
4. Verify: progress bar is continuous (not resetting per section)

- [ ] **Step 6: Test pause/resume**

1. Click pause mid-section
2. Click play again
3. Verify: resumes from same position in same section
