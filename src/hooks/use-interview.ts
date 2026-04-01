"use client";

import { useState, useCallback } from "react";
import type { LearnerIntentProfile } from "@/lib/types/learning";

interface InterviewMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type InterviewPhase = "idle" | "active" | "confirming" | "complete";

export function useInterview() {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<LearnerIntentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      message: string,
      sourceMeta?: { type: string; name?: string; url?: string }
    ) => {
      if (isLoading) return;

      const userMsg: InterviewMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setError(null);

      if (phase === "idle") setPhase("active");

      // Safety valve: force profile after 12 messages (6 exchanges)
      const MAX_MESSAGES = 12;

      try {
        const history = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/learn/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: history.slice(0, -1), sourceMeta }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Interview failed");
        }

        const assistantMsg: InterviewMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.text,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        const allMsgs = [...updatedMessages, assistantMsg];
        const buildProfile = (prof?: Record<string, unknown>): LearnerIntentProfile => ({
          sourceType: (prof?.sourceType as string) ?? "topic",
          purpose: (prof?.purpose as string) ?? "",
          priorKnowledge: (prof?.priorKnowledge as string) ?? "",
          desiredDepth: (prof?.desiredDepth as string) ?? "",
          timeAvailable: (prof?.timeAvailable as string) ?? "",
          focusAreas: (prof?.focusAreas as string[]) ?? [],
          rawTranscript: allMsgs.map((m) => ({ role: m.role, content: m.content })),
        });

        if (data.done && data.profile) {
          setProfile(buildProfile(data.profile));
          setPhase("confirming");
        } else if (allMsgs.length >= MAX_MESSAGES) {
          // Safety valve: force a default profile if interview runs too long
          setProfile(buildProfile());
          setPhase("confirming");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, phase]
  );

  const confirmProfile = useCallback(() => {
    setPhase("complete");
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setPhase("idle");
    setProfile(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    phase,
    isLoading,
    profile,
    error,
    sendMessage,
    confirmProfile,
    reset,
  };
}
