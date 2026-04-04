import {
  findSourceStructure,
  findCachedPageText,
  cachePageText,
  findTopicBySlug,
  insertDocumentChunks,
  deleteDocumentChunks,
  hasDocumentChunks,
} from "@/lib/db/repository";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { extractPDFSection, extractURLSection } from "@/lib/pdf/extractor";
import { chunkAllSections, type ChunkMetadata } from "./chunker";
import { batchEmbedDocuments } from "./client";
import type {
  SourceToc,
  PageCalibration,
  UserScopeSelection,
} from "@/lib/types/learning";

// ── Interfaces ──────────────────────────────────────────

export interface EmbeddingResult {
  success: boolean;
  totalChunks: number;
  sectionsProcessed: number;
  sectionsSkipped: number;
  errors: string[];
}

interface ScopedSection {
  sectionKey: string;
  resolvedTitle: string;
  chapterTitle: string;
  sectionTitle: string | null;
  pageStart: number;
  pageEnd: number;
  sourceUrl?: string;
}

// ── Internal Helpers ────────────────────────────────────

/**
 * Derive the scoped list of sections from TOC + user scope selection.
 *
 * When userScope is null, all chapters are included (first-time flow before
 * the user has explicitly chosen scope). Otherwise, only chapters in the
 * `included` list (and not in `excluded`) are processed.
 */
function getScopedSections(
  toc: SourceToc,
  userScope: UserScopeSelection | null
): ScopedSection[] {
  const included =
    userScope === null
      ? toc.chapters.map((ch) => ch.id)
      : userScope.included;

  const excluded = new Set(userScope?.excluded ?? []);

  const sections: ScopedSection[] = [];

  for (const chapter of toc.chapters) {
    if (!included.includes(chapter.id) || excluded.has(chapter.id)) {
      continue;
    }

    if (chapter.sections.length > 0) {
      for (const section of chapter.sections) {
        if (excluded.has(section.id)) continue;

        sections.push({
          sectionKey: section.id,
          resolvedTitle: `${chapter.title} — ${section.title}`,
          chapterTitle: chapter.title,
          sectionTitle: section.title,
          pageStart: section.pageStart,
          pageEnd: section.pageEnd,
          sourceUrl: chapter.sourceUrl,
        });
      }
    } else {
      sections.push({
        sectionKey: chapter.id,
        resolvedTitle: chapter.title,
        chapterTitle: chapter.title,
        sectionTitle: null,
        pageStart: chapter.pageStart,
        pageEnd: chapter.pageEnd,
        sourceUrl: chapter.sourceUrl,
      });
    }
  }

  return sections;
}

// ── Main Pipeline ───────────────────────────────────────

/**
 * Orchestrate the full embedding flow: read TOC, extract sections, chunk,
 * embed, and store.
 *
 * Designed for background execution after the user selects their scope.
 * - **Idempotent** — re-running with forceReembed overwrites existing chunks
 * - **Cache-aware** — reads sourcePageCache before calling Gemini
 * - **Fault-tolerant** — individual section failures don't abort the pipeline
 * - **Efficient** — downloads PDF once, batch embeds in groups of 100
 */
export async function runEmbeddingPipeline(
  topicId: number,
  topicSlug: string,
  sourceType: string,
  sourcePath: string,
  options?: { forceReembed?: boolean; cachedOnly?: boolean }
): Promise<EmbeddingResult> {
  const errors: string[] = [];

  // 1. Early return if already embedded (unless forced)
  if (!options?.forceReembed && (await hasDocumentChunks(topicId))) {
    return {
      success: true,
      totalChunks: 0,
      sectionsProcessed: 0,
      sectionsSkipped: 0,
      errors: ["Already embedded"],
    };
  }

  // 2. Retrieve source structure
  const structure = await findSourceStructure(topicId);
  if (!structure) {
    return {
      success: false,
      totalChunks: 0,
      sectionsProcessed: 0,
      sectionsSkipped: 0,
      errors: ["Source structure not found for topic"],
    };
  }

  const { rawToc, calibration, userScope } = structure;

  // 3. Determine scoped sections
  const scopedSections = getScopedSections(rawToc, userScope);
  if (scopedSections.length === 0) {
    return {
      success: false,
      totalChunks: 0,
      sectionsProcessed: 0,
      sectionsSkipped: 0,
      errors: ["No sections in scope to embed"],
    };
  }

  // 4. For PDF sources, download the PDF buffer once
  let pdfBuffer: Buffer | null = null;

  if (sourceType === "pdf") {
    const topic = await findTopicBySlug(topicSlug);
    if (!topic?.sourcePath) {
      return {
        success: false,
        totalChunks: 0,
        sectionsProcessed: 0,
        sectionsSkipped: 0,
        errors: ["Topic record or sourcePath not found"],
      };
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(topic.sourcePath);

    if (downloadError || !fileData) {
      return {
        success: false,
        totalChunks: 0,
        sectionsProcessed: 0,
        sectionsSkipped: 0,
        errors: [
          `Failed to download PDF: ${downloadError?.message ?? "no data"}`,
        ],
      };
    }

    pdfBuffer = Buffer.from(await fileData.arrayBuffer());
  }

  // 5. Extract text for each scoped section
  let sectionsProcessed = 0;
  let sectionsSkipped = 0;

  const sectionTexts: Array<{ text: string; metadata: ChunkMetadata }> = [];

  for (const section of scopedSections) {
    try {
      // 5a. Check cache first
      let text = await findCachedPageText(topicId, section.sectionKey);

      // 5b. Extract if not cached (skip Gemini calls in cachedOnly mode)
      if (!text && options?.cachedOnly) {
        sectionsSkipped++;
        continue;
      }
      if (!text) {
        if (sourceType === "pdf" && pdfBuffer) {
          const pageHint = {
            start: section.pageStart + calibration.pdfPageOffset,
            end: section.pageEnd + calibration.pdfPageOffset,
          };
          text = await extractPDFSection(
            pdfBuffer,
            section.resolvedTitle,
            pageHint
          );
        } else if (sourceType === "url") {
          text = await extractURLSection(
            section.sourceUrl || sourcePath,
            section.resolvedTitle
          );
        }

        // Cache the extracted text
        if (text) {
          await cachePageText(
            topicId,
            section.sectionKey,
            section.pageStart,
            section.pageEnd,
            text
          );
        }
      }

      // 5c. Only include sections with meaningful content
      if (text && text.trim().length > 50) {
        sectionTexts.push({
          text,
          metadata: {
            sectionKey: section.sectionKey,
            chapterTitle: section.chapterTitle,
            sectionTitle: section.sectionTitle,
            pageStart: section.pageStart,
            pageEnd: section.pageEnd,
            sourceTitle: rawToc.title,
          },
        });
        sectionsProcessed++;
      } else {
        sectionsSkipped++;
      }
    } catch (err) {
      sectionsSkipped++;
      errors.push(
        `Section "${section.resolvedTitle}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 6. If no text was extracted at all, return error
  if (sectionTexts.length === 0) {
    return {
      success: false,
      totalChunks: 0,
      sectionsProcessed,
      sectionsSkipped,
      errors: [
        "No extractable text from any section",
        ...errors,
      ],
    };
  }

  // 7. Chunk all section texts
  const chunks = chunkAllSections(sectionTexts);

  // 8. Batch embed
  const textsToEmbed = chunks.map(
    (c) => c.contextPrefix + "\n" + c.content
  );
  const embeddings = await batchEmbedDocuments(textsToEmbed);

  // 9. Clear old chunks for idempotency
  await deleteDocumentChunks(topicId);

  // 10. Insert new chunks
  await insertDocumentChunks(
    chunks.map((chunk, i) => ({
      topicId,
      chunkIndex: chunk.globalIndex,
      content: chunk.content,
      embedding: embeddings[i],
      sectionKey: chunk.metadata.sectionKey,
      chapterTitle: chunk.metadata.chapterTitle,
      sectionTitle: chunk.metadata.sectionTitle,
      pageStart: chunk.metadata.pageStart,
      pageEnd: chunk.metadata.pageEnd,
      contextPrefix: chunk.contextPrefix,
      tokenCount: chunk.tokenCount,
    }))
  );

  // 11. Return result
  return {
    success: true,
    totalChunks: chunks.length,
    sectionsProcessed,
    sectionsSkipped,
    errors,
  };
}
