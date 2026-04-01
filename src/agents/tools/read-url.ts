import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { extractURLWithGemini } from "@/lib/pdf/extractor";
import { cachePageText } from "@/lib/db/repository";

/**
 * FunctionTool for the WebExplorer agent.
 * Reads a URL via Gemini urlContext, extracts content, and optionally caches it.
 */
export function createReadURLTool(topicId: number) {
  return new FunctionTool({
    name: "readURL",
    description:
      "Reads a web page and returns its full text content plus any links found on the page. Use this to explore the source material and discover related pages.",
    parameters: z.object({
      url: z.string().describe("The URL to read"),
      cacheAs: z
        .string()
        .optional()
        .describe("If provided, caches the extracted text under this section key (e.g., 'main', 'related-1')"),
    }),
    execute: async ({ url, cacheAs }) => {
      try {
        const prompt = `Read this web page thoroughly. Return TWO things:

1. CONTENT: The full text content of the page — all paragraphs, headings, code blocks, lists, tables. Do NOT summarize. Return the actual content.

2. LINKS: A list of all hyperlinks found in the MAIN CONTENT area (not navigation, footer, or sidebar). For each link, provide:
   - url: the full URL
   - text: the anchor text
   - relevance: "high" if the link appears to be about a related topic, "low" if it's a generic/navigation link

Format your response as:

---CONTENT---
[full page content here]

---LINKS---
[url] | [anchor text] | [relevance]
[url] | [anchor text] | [relevance]`;

        const result = await extractURLWithGemini(url, prompt);

        // Cache if requested
        if (cacheAs) {
          await cachePageText(topicId, cacheAs, 0, 0, result);
        }

        return { text: result, url, cached: !!cacheAs };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : `Failed to read ${url}`,
        };
      }
    },
  });
}
