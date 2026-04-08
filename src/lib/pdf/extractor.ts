import {
  GoogleGenerativeAI,
  type Tool,
} from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_GENAI_API_KEY is required for PDF processing");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Sends a PDF buffer to Gemini and asks it to extract content from specific pages.
 * Gemini natively understands PDFs up to 3600 pages.
 */
export async function extractPDFWithGemini(
  buffer: Buffer,
  prompt: string,
  model: string = "gemini-3-flash-preview"
): Promise<string> {
  const base64 = buffer.toString("base64");

  const geminiModel = genAI.getGenerativeModel({ model });

  const response = await geminiModel.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    { text: prompt },
  ]);

  return response.response.text();
}

/**
 * Extract the table of contents and structure from a PDF.
 * Uses Gemini to read the PDF and identify chapter/section structure.
 */
export async function discoverPDFStructure(
  buffer: Buffer
): Promise<string> {
  const { PDFDocument } = await import("pdf-lib");
  const sourcePdf = await PDFDocument.load(buffer);
  const totalPages = sourcePdf.getPageCount();

  // For large PDFs, extract only the front matter (first 60 pages)
  // which contains the TOC, preface, and enough to discover structure.
  // Gemini has a 1000-page PDF input limit.
  let discoveryBuffer: Buffer;
  if (totalPages > 200) {
    const extractedPdf = await PDFDocument.create();
    const pagesToExtract = Math.min(60, totalPages);
    const copiedPages = await extractedPdf.copyPages(
      sourcePdf,
      Array.from({ length: pagesToExtract }, (_, i) => i)
    );
    copiedPages.forEach((page) => extractedPdf.addPage(page));
    const extractedBytes = await extractedPdf.save();
    discoveryBuffer = Buffer.from(extractedBytes);
  } else {
    discoveryBuffer = buffer;
  }

  const prompt = `Analyze this PDF document. Focus on the Table of Contents, Preface, and Introduction.
${totalPages > 200 ? `\nNOTE: This is the first 60 pages of a ${totalPages}-page document, extracted for TOC discovery. The full document has ${totalPages} pages total. Use the TOC to determine chapter boundaries for the ENTIRE book.\n` : ""}
Extract the complete document structure and return ONLY valid JSON (no markdown, no code fences):

{
  "title": "Book Title",
  "author": "Author Name(s)",
  "totalPages": ${totalPages},
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter Title as it appears in the TOC",
      "pageStart": 1,
      "pageEnd": 28,
      "sections": [
        {
          "id": "ch1.s1",
          "title": "Section Title",
          "pageStart": 1,
          "pageEnd": 5,
          "depth": 1
        }
      ]
    }
  ],
  "calibration": {
    "pdfPageOffset": 0,
    "anchors": [
      { "printedPage": 1, "pdfIndex": 1 }
    ],
    "totalPdfPages": ${totalPages}
  },
  "notes": "Any observations"
}

CRITICAL INSTRUCTIONS:
1. The pageStart and pageEnd must be the PAGE NUMBERS printed in the book (as shown in the TOC)
2. The calibration.pdfPageOffset is the difference between PDF page index and printed page number. If printed page 1 is on PDF page 14, the offset is 13.
3. Find at least 2 anchor points to verify the offset
4. Include ALL chapters and sections listed in the TOC
5. If sections have no page numbers in the TOC, estimate based on chapter boundaries
6. If there is no formal TOC, extract chapter titles from the document structure`;

  return extractPDFWithGemini(discoveryBuffer, prompt);
}

/**
 * Extract text content from specific pages/sections of a PDF.
 * Uses Gemini to read specific sections and return the content.
 */
export async function extractPDFSection(
  buffer: Buffer,
  sectionTitle: string,
  pageHint?: { start: number; end: number }
): Promise<string> {
  const { PDFDocument } = await import("pdf-lib");
  const sourcePdf = await PDFDocument.load(buffer);
  const totalPages = sourcePdf.getPageCount();

  // For large PDFs with a page hint, extract only the relevant pages
  // plus a small margin. This avoids sending the full book to Gemini
  // for each section and stays under the 1000-page API limit.
  let sectionBuffer: Buffer;
  if (pageHint && totalPages > 200) {
    const extractedPdf = await PDFDocument.create();
    // Add margin of 5 pages on each side for context
    const startPage = Math.max(0, pageHint.start - 5);
    const endPage = Math.min(totalPages - 1, pageHint.end + 5);
    const pageIndices = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
    const copiedPages = await extractedPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => extractedPdf.addPage(page));
    const extractedBytes = await extractedPdf.save();
    sectionBuffer = Buffer.from(extractedBytes);
  } else {
    sectionBuffer = buffer;
  }

  const pageContext = pageHint
    ? `The section is expected around pages ${pageHint.start}-${pageHint.end} (printed page numbers).`
    : "";

  const prompt = `Extract the complete text content of the section titled "${sectionTitle}" from this PDF document. ${pageContext}

Return the full text of this section, preserving:
- All paragraphs and their structure
- Code examples (wrapped in triple backticks)
- Key definitions and terminology
- Any figures or tables described in text

Do NOT summarize. Return the actual content from the book for this section.`;

  return extractPDFWithGemini(sectionBuffer, prompt);
}

// ── URL Extraction via Gemini urlContext ─────────────────

/**
 * Uses Gemini's urlContext tool to read a URL and extract content.
 * Gemini fetches the URL server-side and reads the page content.
 */
export async function extractURLWithGemini(
  url: string,
  prompt: string,
  model: string = "gemini-3-flash-preview"
): Promise<string> {
  const geminiModel = genAI.getGenerativeModel({
    model,
    tools: [{ urlContext: {} } as unknown as Tool],
  });

  const response = await geminiModel.generateContent(
    `${prompt}\n\nURL to read: ${url}`
  );

  return response.response.text();
}

/**
 * Discover structure from a URL — extract heading hierarchy as TOC.
 */
export async function discoverURLStructure(url: string): Promise<string> {
  const prompt = `Read the content at the following URL and extract its complete structure.

Analyze the page headings (h1, h2, h3), navigation structure, and content sections.

Return ONLY valid JSON (no markdown, no code fences):

{
  "title": "Page or Site Title",
  "author": "Author if visible",
  "totalPages": 1,
  "chapters": [
    {
      "id": "s1",
      "title": "Section heading from the page",
      "pageStart": 1,
      "pageEnd": 1,
      "sections": [
        {
          "id": "s1.sub1",
          "title": "Subsection heading",
          "pageStart": 1,
          "pageEnd": 1,
          "depth": 1
        }
      ]
    }
  ],
  "calibration": {
    "pdfPageOffset": 0,
    "anchors": [],
    "totalPdfPages": 1
  },
  "notes": "This is a web page. Sections represent heading hierarchy."
}

If this is a documentation site with multiple pages (visible in navigation/sidebar), list each linked page as a separate "chapter" with its URL path as the id.

Include ALL visible sections and subsections.`;

  return extractURLWithGemini(url, prompt);
}

/**
 * Extract content from a specific section of a URL.
 */
export async function extractURLSection(
  url: string,
  sectionTitle: string
): Promise<string> {
  const prompt = `Read the content at the following URL and extract the section titled "${sectionTitle}".

Return the full text content of that section, preserving:
- All paragraphs and structure
- Code examples (wrapped in triple backticks)
- Key definitions and terminology
- Lists and tables

Do NOT summarize. Return the actual content from the page.`;

  return extractURLWithGemini(url, prompt);
}
