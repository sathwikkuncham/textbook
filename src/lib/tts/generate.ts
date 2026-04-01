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

/** Skip sections that are primarily visual (diagrams/tables with little readable text) */
function shouldSkipForAudio(rawBody: string): boolean {
  const hasMermaid = /~~~mermaid|```mermaid/i.test(rawBody);
  const hasTable = /\|.*\|.*\|/m.test(rawBody);
  if (!hasMermaid && !hasTable) return false;
  const strippedText = stripMarkdown(rawBody);
  return strippedText.length < 50;
}

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
  const splits: { index: number; title: string; start: number; matchStart: number }[] = [];

  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    splits.push({
      index: parseInt(match[1], 10) - 1, // 0-based: "### 1." -> index 0
      title: match[2].trim(),
      start: match.index + match[0].length,
      matchStart: match.index,
    });
  }

  if (splits.length === 0) return [];

  const sections: ContentSection[] = [];
  for (let i = 0; i < splits.length; i++) {
    const { index, title, start } = splits[i];
    const end = i + 1 < splits.length ? splits[i + 1].matchStart : markdown.length;
    const rawBody = markdown.slice(start, end).trim();

    if (shouldSkipForAudio(rawBody)) continue;

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
