import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { extractPDFSection, extractURLSection } from "@/lib/pdf/extractor";
import {
  findSourceStructure,
  findCachedPageText,
  cachePageText,
  findTopicBySlug,
  hasDocumentChunks,
  getChunksBySection,
} from "@/lib/db/repository";

/**
 * Unified source content tool — works for both PDFs and URLs.
 * Agents call fetchSourceSection("section title") without knowing the source type.
 */
export function createFetchSourceContentTool(
  topicId: number,
  topicSlug: string,
  sourceType: string,
  sourcePath: string
) {
  return new FunctionTool({
    name: "fetchSourceSection",
    description:
      "Fetches text content from a specific section of the source material (PDF, URL, or documentation). Use this to reference the original source when teaching.",
    parameters: z.object({
      sectionTitle: z
        .string()
        .describe("The title of the chapter or section to fetch"),
    }),
    execute: async ({ sectionTitle }) => {
      try {
        const sourceStructure = await findSourceStructure(topicId);
        if (!sourceStructure) {
          return { error: "Source structure not found" };
        }

        const toc = sourceStructure.rawToc;
        const calibration = sourceStructure.calibration;

        // Find matching section in TOC
        let sectionKey = "";
        let resolvedTitle = sectionTitle;
        let pageStart: number | null = null;
        let pageEnd: number | null = null;
        let chapterSourceUrl: string | undefined;
        const searchTerm = sectionTitle.toLowerCase();

        for (const chapter of toc.chapters) {
          if (chapter.title.toLowerCase().includes(searchTerm)) {
            sectionKey = chapter.id;
            resolvedTitle = chapter.title;
            pageStart = chapter.pageStart;
            pageEnd = chapter.pageEnd;
            chapterSourceUrl = chapter.sourceUrl;
            break;
          }
          for (const section of chapter.sections) {
            if (section.title.toLowerCase().includes(searchTerm)) {
              sectionKey = section.id;
              resolvedTitle = section.title;
              pageStart = section.pageStart;
              pageEnd = section.pageEnd;
              chapterSourceUrl = chapter.sourceUrl;
              break;
            }
          }
          if (sectionKey) break;
        }

        if (!sectionKey) {
          const available = toc.chapters.map((ch) => ch.title).join(", ");
          return {
            error: `Section "${sectionTitle}" not found. Available: ${available}`,
          };
        }

        // Priority 1: Check document_chunks (embedded vectors — cheapest)
        const chunksExist = await hasDocumentChunks(topicId);
        if (chunksExist) {
          const chunks = await getChunksBySection(topicId, sectionKey);
          if (chunks.length > 0) {
            const text = chunks.map((c) => c.content).join("\n\n");
            return { text, source: sectionKey, cached: true, retrieval: "vector" };
          }
        }

        // Priority 2: Check sourcePageCache
        const cached = await findCachedPageText(topicId, sectionKey);
        if (cached) {
          return { text: cached, source: sectionKey, cached: true, retrieval: "cache" };
        }

        // Extract based on source type
        let text: string;

        if (sourceType === "pdf") {
          // PDF: download from Supabase Storage, extract via Gemini PDF parser
          const topicRecord = await findTopicBySlug(topicSlug);
          if (!topicRecord?.sourcePath) {
            return { error: "No source file found" };
          }

          const { data: fileData } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(topicRecord.sourcePath);

          if (!fileData) {
            return { error: "Failed to download source file" };
          }

          const buffer = Buffer.from(await fileData.arrayBuffer());
          const pageHint =
            pageStart !== null && pageEnd !== null
              ? {
                  start: pageStart + calibration.pdfPageOffset,
                  end: pageEnd + calibration.pdfPageOffset,
                }
              : undefined;

          text = await extractPDFSection(buffer, resolvedTitle, pageHint);
        } else {
          // URL: read via Gemini urlContext
          const urlToFetch = chapterSourceUrl || sourcePath;
          text = await extractURLSection(urlToFetch, resolvedTitle);
        }

        // Cache the result
        await cachePageText(
          topicId,
          sectionKey,
          pageStart ?? 0,
          pageEnd ?? 0,
          text
        );

        return { text, source: sectionKey, cached: false, retrieval: "gemini" };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Fetch failed",
        };
      }
    },
  });
}
