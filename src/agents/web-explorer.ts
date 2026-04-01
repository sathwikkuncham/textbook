import { LlmAgent } from "@google/adk";
import { MODELS } from "./models";
import { createReadURLTool } from "./tools/read-url";

/**
 * Web Explorer agent — discovers and caches content from a URL and its linked pages.
 * Used during topic discovery for URL-based sources.
 */
export function createWebExplorer(topicId: number, startingUrl: string) {
  return new LlmAgent({
    name: "WebExplorer",
    model: MODELS.FLASH,
    description:
      "Explores web pages, follows relevant links, and builds a comprehensive site map for learning",
    tools: [createReadURLTool(topicId)],
    instruction: `You are a web exploration agent. Your job is to read a starting URL, discover related content, and build a comprehensive map of all relevant pages for a learner.

## Your Process

1. Read the starting URL using the readURL tool. Cache it with cacheAs="main".
2. From the links found on the page, identify which are RELEVANT to the topic:
   - Same domain or explicitly referenced academic/technical resources
   - Links that appear in the main content (not navigation, footer, sidebar junk)
   - Links to related papers, blog posts, documentation, or code repos
   - Prioritize "high" relevance links
3. Read the most relevant linked pages (max 8 additional pages). Cache each with a descriptive cacheAs key (e.g., "related-polarquant", "paper-arxiv").
4. Build a site map as a JSON SourceToc structure.

## Constraints

- Read at most 10 total pages (including the starting page)
- Strongly prefer same-domain links
- Skip obvious non-content pages: login, privacy policy, terms, cookie notices, signup
- Skip media files, downloads, and non-HTML links
- If a linked page is behind a paywall or requires authentication, note it but don't fail
- Stop exploring if content becomes clearly off-topic

## Output Format

After exploring, return ONLY a valid JSON object (no markdown, no code fences):

{
  "title": "Main Page Title",
  "author": "Author if visible",
  "totalPages": <number of pages discovered>,
  "chapters": [
    {
      "id": "main",
      "title": "Main Page Title",
      "pageStart": 1,
      "pageEnd": 1,
      "sourceUrl": "${startingUrl}",
      "sections": [
        {
          "id": "main.s1",
          "title": "Heading from the page",
          "pageStart": 1,
          "pageEnd": 1,
          "depth": 1
        }
      ]
    },
    {
      "id": "related-1",
      "title": "Related Page Title",
      "pageStart": 1,
      "pageEnd": 1,
      "sourceUrl": "https://...",
      "sections": [...]
    }
  ],
  "calibration": {
    "pdfPageOffset": 0,
    "anchors": [],
    "totalPdfPages": <number of pages>
  }
}

Each "chapter" represents one web page. The "sections" within it represent the heading hierarchy of that page. The "sourceUrl" field stores the URL for each page.

## Starting URL

${startingUrl}

Read this URL first, explore its links, then produce the complete site map.`,
    outputKey: "exploration_result",
  });
}
