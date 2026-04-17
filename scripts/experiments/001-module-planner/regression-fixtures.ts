/**
 * Regression fixtures — a "quick overview" learner with limited time.
 *
 * The winning variant should NOT produce 6-8 sections for this profile.
 * If it does, we've introduced a regression that hurts casual learners.
 */

import type { ModulePlan } from "@/lib/types/learning";

export const moduleTitle = "Docker Basics for Web Developers";

export const modulePlan: ModulePlan = {
  goal: "Get a working mental model of Docker so you can containerize a simple Node app by the end.",
  concepts: [
    "Containers vs VMs",
    "Docker images and the layer system",
    "Dockerfile basics",
    "Running containers with docker run",
    "Port mapping and volumes",
    "docker-compose for multi-service apps",
  ],
  sourceRefs: [],
  prerequisites: [],
};

// Casual learner, limited time, just wants the gist
export const compressedInterview = [
  "Purpose: Quick practical understanding so I can containerize my side project this weekend.",
  "Prior knowledge: Web developer with 3 years experience, comfortable with the command line, never used Docker.",
  "Desired depth: Just the essentials — I'll dig deeper later if I need to.",
  "Time available: Maybe 30-45 minutes total. I need to move fast.",
  "Focus areas: Practical usage, basic commands, enough to get started",
  "Source type: Topic only (no source material)",
].join("\n");

export const rawTranscript = [
  `User: I want to learn Docker basics. Just the essentials — I need to containerize my side project this weekend and I've been putting it off for a year. I have maybe 30-45 minutes total.`,
  ``,
  `Assistant: Got it. Quick and practical. What's your background?`,
  ``,
  `User: Web dev for 3 years. Comfortable with command line. Never used Docker before. I just want to get to a working mental model fast, not every edge case.`,
  ``,
  `Assistant: Perfect. We'll skip theory deep-dives and focus on: containers vs VMs (just enough to know the difference), then Dockerfile basics, then running containers. By the end you should be able to containerize a simple Node app. Good?`,
  ``,
  `User: Yes, exactly that. Let's go.`,
].join("\n");
