/**
 * Gita/Vedanta fixture — the stress test for cross-domain generality.
 *
 * Source: Topic 24 (Shankaracharya's Commentary, advanced+deep, PDF-sourced).
 *
 * Why this is a hard test:
 * - Sanskrit terminology that must be grounded (Viveka, Adhyasa, Brahman...)
 * - Non-linear concept dependencies (Brahman and Maya mutually define)
 * - Scholarly-contemplative voice, not technical
 * - Risk of Western-academic framing regression
 * - Risk of over-compression because concepts aren't "chapters"
 *
 * Production baseline: Module 1 has 4 subtopics (Sadhana Chatushtaya,
 * Adhyasa, Saguna/Nirguna Brahman, Pravritti/Nivritti).
 */

import type { TopicFixture } from "./multi-topic-fixtures";

const intent = {
  purpose: "Deep philosophical mastery and first-principles understanding of Advaita Vedanta",
  priorKnowledge: "Exposure to Buddhism and Advaita Vedanta; requires a 'from scratch' approach to ensure foundational clarity",
  desiredDepth: "Maximum — exhaustive, verse-by-verse and commentary-by-commentary study",
  timeAvailable: "Indefinite/Long-term (1-2 years); no rush",
  focusAreas: [
    "Shankaracharya's Introduction (Upodghata)",
    "Advaita Vedanta metaphysics vs. Buddhist thought",
    "First-principles building of Non-dualism",
    "Full 18-chapter commentary analysis",
    "Sadhana Chatushtaya (qualifications for knowledge)",
  ],
  sourceType: "PDF (Bhagavad Gita with Shankaracharya's Commentary)",
};

function formatTranscript(turns: Array<{ role: string; content: string }>): string {
  return turns.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`).join("\n\n");
}

function formatCompressed(): string {
  return [
    `Purpose: ${intent.purpose}`,
    `Prior knowledge: ${intent.priorKnowledge}`,
    `Desired depth: ${intent.desiredDepth}`,
    `Time available: ${intent.timeAvailable}`,
    `Focus areas: ${intent.focusAreas.join(", ")}`,
    `Source type: ${intent.sourceType}`,
  ].join("\n");
}

export const topicShankaracharya: TopicFixture = {
  id: 24,
  slug: "advaita-vedanta-shankaracharyas-commentary",
  displayName: "Advaita Vedanta: Shankaracharya's Commentary",
  moduleTitle: "Upodghata: The Prologue and Foundations of Adhyasa",
  modulePlan: {
    // Aggregated from the existing production subtopics' key_concepts
    goal: "Establish the foundational logic of Shankaracharya's commentary: why knowledge is the only path to liberation and the nature of the 'Superimposition' (Adhyasa) error.",
    concepts: [
      "Viveka (discrimination between real and unreal)",
      "Vairagya (dispassion toward transient things)",
      "Shatka Sampatti (six inner qualifications)",
      "Mumukshutva (intense longing for liberation)",
      "Subject-Object confusion",
      "Avidya (primordial ignorance)",
      "Atman vs. Anatman (Self vs. non-Self)",
      "Saguna Brahman (Reality with attributes)",
      "Nirguna Brahman (Reality without attributes)",
      "The logic of incarnation (Vasudeva as Brahman)",
      "Pravritti (action for prosperity)",
      "Nivritti (withdrawal for knowledge)",
    ],
    sourceRefs: ["Shankaracharya's Upodghata"],
    prerequisites: [],
  },
  compressedInterview: formatCompressed(),
  rawTranscript: formatTranscript([
    { role: "user", content: "I want to learn about: Bhagawad Gita, Shankaracharya's commentary. In depth. From scratch to the advanced philosophical depth. We use the commentary by Shankaracharya extensively. We will also define what is advaita vedanta and use first principles to build the whole thing from bottom up. (from a PDF: Bhagavad-Gita.with.the.Commentary.of.Sri.Shankaracharya.pdf)" },
    { role: "assistant", content: "That sounds like a profound undertaking. Diving into the Gita through the lens of Shankaracharya's Advaita Vedanta is a journey into the heart of non-dualism. To help me structure this roadmap, could you tell me a bit about your primary goal for this study? Are you looking for personal spiritual growth, preparing for academic research, or perhaps building a foundation to eventually teach these concepts? Also, how much time can you realistically dedicate to this study each week?" },
    { role: "user", content: "I want to go in depth philosophically. I need to delve deeper into this from scratch even when I have some exposure to Buddhism and Advaita vedanta. I would like to start from scratch using first princpiles." },
    { role: "assistant", content: "That background in Buddhism will be incredibly helpful, especially when we start looking at the distinctions between Sunyata and Shankaracharya's Brahman. Since you want to build this from first principles, it's a rigorous path. To make sure we pace this correctly, are you looking to go through the entire PDF cover-to-cover (all 18 chapters and every verse of the commentary), or would you prefer to focus on the key metaphysical chapters first (like Chapters 2, 7, 13, and 18) where the Advaita philosophy is most concentrated? Also, how many hours a week do you see yourself dedicating to this study?" },
    { role: "user", content: "Entire PDF cover to cover all 18 chapters and introduction and everything. I have years. I don't mind anything about time. I don't mind if this takes me an year or two. No rush. No time limit." },
    { role: "assistant", content: "That's a magnificent goal. Given the depth of Shankara's Bhashya and your desire to build from first principles without a time constraint, we can really dig into the logic behind the non-dualist perspective, the Sanskrit nuances, and the rigorous dialectics Shankaracharya uses." },
  ]),
  productionSubtopicCount: 4,
  productionSubtopicTitles: [
    "Sadhana Chatushtaya: The Qualifications",
    "The Nature of Superimposition (Adhyasa)",
    "Vasudeva as Brahman: Personal vs. Impersonal Reality",
    "The Purpose of the Gita: Pravritti and Nivritti",
  ],
  profileSummary: "Advanced · Maximum depth · 1-2 years · Non-dualism, first principles · 12 Sanskrit concepts",
};
