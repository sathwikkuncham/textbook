import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { extractPDFSection } from "@/lib/pdf/extractor";
import {
  findSourceStructure,
  findCachedPageText,
  cachePageText,
  findTopicBySlug,
} from "@/lib/db/repository";

export function createFetchPDFSectionTool(
  topicId: number,
  topicSlug: string
) {
  return new FunctionTool({
    name: "fetchPDFSection",
    description:
      "Fetches text content from a specific section of the source PDF. Use this to reference the original source material when teaching.",
    parameters: z.object({
      sectionTitle: z
        .string()
        .describe("The title of the chapter or section to fetch"),
    }),
    execute: async ({ sectionTitle }) => {
      try {
        const topicRecord = await findTopicBySlug(topicSlug);
        if (!topicRecord?.sourcePath) {
          return { error: "No source file found" };
        }

        const sourceStructure = await findSourceStructure(topicId);
        if (!sourceStructure) {
          return { error: "Source structure not found" };
        }

        const toc = sourceStructure.rawToc;
        const calibration = sourceStructure.calibration;

        // Find matching section
        let sectionKey = "";
        let resolvedTitle = sectionTitle;
        let pageStart: number | null = null;
        let pageEnd: number | null = null;
        const searchTerm = sectionTitle.toLowerCase();

        for (const chapter of toc.chapters) {
          if (chapter.title.toLowerCase().includes(searchTerm)) {
            sectionKey = chapter.id;
            resolvedTitle = chapter.title;
            pageStart = chapter.pageStart;
            pageEnd = chapter.pageEnd;
            break;
          }
          for (const section of chapter.sections) {
            if (section.title.toLowerCase().includes(searchTerm)) {
              sectionKey = section.id;
              resolvedTitle = section.title;
              pageStart = section.pageStart;
              pageEnd = section.pageEnd;
              break;
            }
          }
          if (sectionKey) break;
        }

        if (!sectionKey) {
          const available = toc.chapters
            .map((ch) => ch.title)
            .join(", ");
          return {
            error: `Section "${sectionTitle}" not found. Available: ${available}`,
          };
        }

        // Check cache
        const cached = await findCachedPageText(topicId, sectionKey);
        if (cached) {
          return { text: cached, source: sectionKey, cached: true };
        }

        // Download PDF and extract section via Gemini
        const { data: fileData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(topicRecord.sourcePath);

        if (!fileData) {
          return { error: "Failed to download PDF" };
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());
        const pageHint =
          pageStart !== null && pageEnd !== null
            ? {
                start: pageStart + calibration.pdfPageOffset,
                end: pageEnd + calibration.pdfPageOffset,
              }
            : undefined;

        const text = await extractPDFSection(
          buffer,
          resolvedTitle,
          pageHint
        );

        // Cache
        await cachePageText(
          topicId,
          sectionKey,
          pageStart ?? 0,
          pageEnd ?? 0,
          text
        );

        return { text, source: sectionKey, cached: false };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Fetch failed",
        };
      }
    },
  });
}
