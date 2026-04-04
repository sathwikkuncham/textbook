// ── Constants ───────────────────────────────────────────

const CHUNK_SIZE = 2048;
const CHUNK_OVERLAP = 200;

/** Ordered separators for recursive splitting, from strongest to weakest. */
const SEPARATORS = ["\n\n", "\n", ". ", " "];

// ── Interfaces ──────────────────────────────────────────

export interface ChunkMetadata {
  sectionKey: string;
  chapterTitle: string;
  sectionTitle: string | null;
  pageStart: number;
  pageEnd: number;
  sourceTitle: string;
}

export interface TextChunk {
  content: string;
  contextPrefix: string;
  tokenCount: number;
  metadata: ChunkMetadata;
}

// ── Internal Helpers ────────────────────────────────────

/**
 * Estimate token count using a 4-characters-per-token ratio.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build a contextual prefix string from chunk metadata.
 *
 * Format: `[Source: "title" | Chapter: chapterTitle | Section: sectionTitle | Pages N-M]`
 * - Section is omitted when `sectionTitle` is null.
 * - Pages is omitted when `pageStart` is 0.
 */
function buildContextPrefix(metadata: ChunkMetadata): string {
  const parts: string[] = [
    `Source: "${metadata.sourceTitle}"`,
    `Chapter: ${metadata.chapterTitle}`,
  ];

  if (metadata.sectionTitle !== null) {
    parts.push(`Section: ${metadata.sectionTitle}`);
  }

  if (metadata.pageStart > 0) {
    parts.push(`Pages ${metadata.pageStart}-${metadata.pageEnd}`);
  }

  return `[${parts.join(" | ")}]`;
}

/**
 * Recursive character text splitter.
 *
 * Splits text into chunks of at most {@link CHUNK_SIZE} characters, trying
 * the strongest separator first (double newline) and falling back to weaker
 * ones. Maintains {@link CHUNK_OVERLAP} characters of overlap between
 * consecutive chunks for context continuity.
 */
function recursiveSplit(text: string): string[] {
  // Base case: text fits in a single chunk
  if (text.length <= CHUNK_SIZE) {
    const trimmed = text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  // Try each separator in priority order
  for (const sep of SEPARATORS) {
    const parts = text.split(sep);

    // Separator not present — try the next one
    if (parts.length <= 1) continue;

    const chunks: string[] = [];
    let current = parts[0];

    for (let i = 1; i < parts.length; i++) {
      const candidate = current + sep + parts[i];

      if (candidate.length > CHUNK_SIZE && current.length > 0) {
        chunks.push(current);
        // Start new chunk with overlap from end of previous
        current = current.slice(-CHUNK_OVERLAP) + sep + parts[i];
      } else {
        current = candidate;
      }
    }

    // Push the remaining content
    if (current.trim().length > 0) {
      chunks.push(current);
    }

    // Only accept if we actually split into multiple pieces
    if (chunks.length > 1) {
      // Recursively split any chunk that is still too large
      return chunks.flatMap((chunk) =>
        chunk.length > CHUNK_SIZE ? recursiveSplit(chunk) : [chunk.trim()]
      ).filter((c) => c.length > 0);
    }
  }

  // Hard fallback: split at CHUNK_SIZE with CHUNK_OVERLAP step
  const chunks: string[] = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (let i = 0; i < text.length; i += step) {
    const slice = text.slice(i, i + CHUNK_SIZE).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }
  }

  return chunks;
}

// ── Public API ──────────────────────────────────────────

/**
 * Chunk a single section's text into embedding-ready segments.
 *
 * Each returned {@link TextChunk} includes:
 * - The raw `content` from splitting
 * - A `contextPrefix` built from metadata for retrieval grounding
 * - An estimated `tokenCount` (prefix + content)
 * - The original `metadata` for downstream use
 */
export function chunkSection(
  text: string,
  metadata: ChunkMetadata
): TextChunk[] {
  const rawChunks = recursiveSplit(text);
  const contextPrefix = buildContextPrefix(metadata);

  return rawChunks.map((content) => ({
    content,
    contextPrefix,
    tokenCount: estimateTokens(contextPrefix + content),
    metadata,
  }));
}

/**
 * Chunk multiple sections and assign a globally unique 0-based `globalIndex`
 * across all sections. Useful for building a flat embedding batch from a
 * structured document.
 */
export function chunkAllSections(
  sections: Array<{ text: string; metadata: ChunkMetadata }>
): Array<TextChunk & { globalIndex: number }> {
  const result: Array<TextChunk & { globalIndex: number }> = [];
  let globalIndex = 0;

  for (const section of sections) {
    const chunks = chunkSection(section.text, section.metadata);

    for (const chunk of chunks) {
      result.push({ ...chunk, globalIndex });
      globalIndex++;
    }
  }

  return result;
}
