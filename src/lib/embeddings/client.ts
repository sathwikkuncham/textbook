import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

// ── Constants ───────────────────────────────────────────

const MODEL = "gemini-embedding-001";

/** Gemini's maximum batch size for embedding requests. */
const BATCH_SIZE = 100;

// ── Client Initialization ───────────────────────────────

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_GENAI_API_KEY is required for embeddings");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: MODEL });

// ── Public API ──────────────────────────────────────────

/**
 * Embed a single text for storage in a vector database.
 * Uses RETRIEVAL_DOCUMENT task type, optimised for document indexing.
 * Returns a 3072-dimensional float array.
 */
export async function embedDocument(text: string): Promise<number[]> {
  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });

  return result.embedding.values;
}

/**
 * Embed a single text for semantic search / query matching.
 * Uses RETRIEVAL_QUERY task type, optimised for finding relevant documents.
 * Returns a 3072-dimensional float array.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  return result.embedding.values;
}

/**
 * Batch-embed multiple texts for document storage.
 * Automatically splits into batches of {@link BATCH_SIZE} (100) to stay within
 * Gemini's per-request limit. Returns embeddings in the same order as the input.
 */
export async function batchEmbedDocuments(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const result = await model.batchEmbedContents({
      requests: batch.map((text) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text }], role: "user" as const },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      })),
    });

    allEmbeddings.push(...result.embeddings.map((e) => e.values));
  }

  return allEmbeddings;
}
