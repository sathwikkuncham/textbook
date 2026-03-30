# Section-Based Audio Narration

## Problem

The current audio feature has three critical bugs:

1. **Noise instead of audio** — Gemini TTS returns raw PCM (`audio/L16;rate=24000`). The code skips WAV header wrapping, so browsers can't decode the file. **Fixed** in `generate.ts` by calling `createWavBuffer`.
2. **Paragraph highlighting mismatch** — `extractParagraphs` (timing) and ReactMarkdown's `<p>` counter (highlighting) count differently. Headers, lists, tables increment one counter but not the other, causing progressive drift.
3. **Mermaid diagram shutter** — Every `timeupdate` event (~4/sec) updates `activeParagraphIndex` state, which re-renders the entire `ReactMarkdown` tree, causing `MermaidDiagram` components to unmount/remount and flash.

Additionally:
- Content uses `~~~mermaid` (tilde fences) but `extractParagraphs` only strips `` ``` `` (backtick fences), leaking mermaid syntax into TTS text.
- Paragraph timings are estimated at flat 150 WPM with no relationship to actual TTS pacing.
- The entire subtopic is one TTS call (~3 min generation time).

## Solution

Replace paragraph-level audio with **section-level audio**. Every subtopic has 7 known sections (`### 1. Why This Matters` through `### 7. Key Takeaway`). Generate a separate audio file per section, skip "Visualizing It" (section 3, contains diagrams/tables), and highlight the active section during playback.

## Data Model

No new columns. Repurpose existing fields on `module_content`:

- `audio_url` — set to `"sections"` as a non-null cache sentinel
- `paragraph_timings` — stores sections metadata as jsonb:

```json
[
  { "index": 0, "title": "Why This Matters", "audioUrl": "https://...supabase.../section-0.wav" },
  { "index": 1, "title": "Core Idea", "audioUrl": "https://...supabase.../section-1.wav" },
  { "index": 3, "title": "Real-World Analogy", "audioUrl": "https://...supabase.../section-3.wav" },
  { "index": 4, "title": "Concrete Example", "audioUrl": "https://...supabase.../section-4.wav" },
  { "index": 5, "title": "Common Pitfalls", "audioUrl": "https://...supabase.../section-5.wav" },
  { "index": 6, "title": "Key Takeaway", "audioUrl": "https://...supabase.../section-6.wav" }
]
```

Section 2 ("Visualizing It") is absent from the array — never generated.

Supabase storage paths: `audio/{topicId}/{moduleId}/section-{index}.wav`

## Components

### 1. `src/lib/tts/generate.ts`

**Add `extractSections(markdown: string): Section[]`**

- Split content by `### N.` header pattern
- For each section: strip markdown (code blocks with both `` ``` `` AND `~~~` fences, inline code, images, links, HTML, tables, formatting)
- Skip the section whose title matches "Visualizing It"
- Return array of `{ index, title, text }` where `text` is the cleaned readable text

**Remove** `extractParagraphs` and `estimateParagraphTimings` (dead code after this change).

**Keep** `generateAudio(text)` and `createWavBuffer` unchanged.

### 2. `src/app/api/learn/audio/route.ts`

**Cache check:**
- `findAudio(topicId, moduleId)` returns cached data
- If `audioUrl` is non-null and `paragraphTimings` is a non-empty array, return cached sections

**Generation (cache miss):**
- Fetch module content
- Call `extractSections(content)` to get sections
- Generate audio for all sections **in parallel**: `Promise.all(sections.map(s => generateAudio(s.text)))`
- Upload each WAV to Supabase at `audio/{topicId}/{moduleId}/section-{s.index}.wav` with `upsert: true`
- Get public URLs for each
- Save to DB: `audioUrl = "sections"`, `paragraphTimings = sectionsArray`
- Return sections array

### 3. `src/lib/db/repository.ts`

**`findAudio`** — unchanged (already returns `{ audioUrl, paragraphTimings }`)

**`saveAudio`** — unchanged (already takes `audioUrl: string, paragraphTimings: unknown`)

Both functions work as-is because the schema is flexible (`audioUrl` is `text`, `paragraphTimings` is `jsonb`).

### 4. `src/hooks/use-audio-player.ts`

**Rewrite for sequential section playback:**

State:
- `sections: SectionAudio[]` — array from API response
- `currentSectionIndex: number` — which section is playing (-1 = none)
- `isPlaying`, `isLoading`, `progress`, `currentTime`, `duration`

Behavior:
- On `play()`: fetch sections from API (or use cached), create Audio element for first section, start playing
- On section end: auto-advance to next section (create new Audio element)
- `duration` = sum of all section Audio durations (computed as each loads)
- `progress` = (completed sections time + current section currentTime) / total duration
- `currentTime` = cumulative time across all played sections
- On `pause()`: pause current section's Audio element
- On `toggle()`: resume current section or start from beginning

Preloading: when section N starts playing, create Audio element for section N+1 so it's ready.

Cleanup: on topic/subtopic change, pause and discard all Audio elements.

### 5. `src/components/layout/main-content.tsx`

**Split content into sections for rendering:**

Add `splitContentSections(markdown: string)` utility that splits by `### N.` headers and returns `{ index, title, body }[]` (keeping raw markdown, not stripping).

**Memoized section rendering:**

```tsx
const MemoizedSectionContent = React.memo(({ markdown }: { markdown: string }) => (
  <ReactMarkdown ...>{markdown}</ReactMarkdown>
));

// In render:
{sections.map((section) => (
  <div
    key={section.index}
    className={cn(
      "transition-all duration-300",
      activeSectionIndex === section.index && "border-l-2 border-primary bg-primary/5 pl-4 -ml-4 rounded-r-lg"
    )}
  >
    <h3>...</h3>
    <MemoizedSectionContent markdown={section.body} />
  </div>
))}
```

When `activeSectionIndex` changes:
- Wrapper div re-renders (className change) — cheap
- `MemoizedSectionContent` does NOT re-render (markdown prop unchanged)
- MermaidDiagram inside does NOT unmount/remount — no shutter

**Remove:** `activeParagraphIndex` prop, `pIndex` counter, paragraph-level highlight logic.

### 6. `src/components/ui/audio-player.tsx`

Minor changes:
- `AudioProgressBar` works the same (receives overall progress/duration/currentTime from hook)
- No structural changes needed

### 7. `src/components/layout/panel-layout.tsx`

- Pass `audioPlayer.currentSectionIndex` instead of `audioPlayer.currentParagraphIndex`
- Rename prop from `activeParagraphIndex` to `activeSectionIndex`

## What This Fixes

| Bug | How it's fixed |
|-----|---------------|
| Noise audio | `createWavBuffer` wraps raw PCM in WAV headers (already fixed) |
| Mermaid syntax in TTS | `~~~` fences stripped alongside `` ``` `` fences |
| Paragraph highlight drift | Replaced with section-level highlighting (7 sections, not ~20 paragraphs) |
| Mermaid diagram shutter | Memoized section rendering — audio ticks don't re-render ReactMarkdown tree |
| 3-min generation time | 6 parallel TTS calls for smaller sections — each returns faster |
| Visualizing It read aloud | Section 3 skipped entirely |
| Re-fetch on every click | Section audio cached in DB, sequential playback resumes correctly |
