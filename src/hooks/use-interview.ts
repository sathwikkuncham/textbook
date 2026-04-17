"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { LearnerIntentProfile } from "@/lib/types/learning";

interface InterviewMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type InterviewPhase = "idle" | "active" | "confirming" | "complete";

const STORAGE_PREFIX = "interview:";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredInterview {
  messages: InterviewMessage[];
  phase: InterviewPhase;
  profile: LearnerIntentProfile | null;
  timestamp: number;
}

function getStorageKey(topicName: string) {
  return `${STORAGE_PREFIX}${topicName}`;
}

function loadFromStorage(topicName: string): StoredInterview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(topicName));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredInterview;
    if (Date.now() - stored.timestamp > EXPIRY_MS) {
      localStorage.removeItem(getStorageKey(topicName));
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

function saveToStorage(topicName: string, data: Omit<StoredInterview, "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getStorageKey(topicName),
      JSON.stringify({ ...data, timestamp: Date.now() })
    );
  } catch {
    // localStorage full or unavailable — non-critical
  }
}

function clearStorage(topicName: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(topicName));
  } catch {
    // non-critical
  }
}

export function useInterview(topicName?: string) {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<LearnerIntentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!topicName || restoredRef.current) return;
    restoredRef.current = true;
    const stored = loadFromStorage(topicName);
    if (stored && stored.phase !== "idle" && stored.phase !== "complete") {
      setMessages(stored.messages);
      setPhase(stored.phase);
      setProfile(stored.profile);
    }
  }, [topicName]);

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

        const allMsgs = [...updatedMessages, assistantMsg];
        setMessages(allMsgs);

        const buildProfile = (prof?: Record<string, unknown>): LearnerIntentProfile => ({
          sourceType: (prof?.sourceType as string) ?? "topic",
          purpose: (prof?.purpose as string) ?? "",
          priorKnowledge: (prof?.priorKnowledge as string) ?? "",
          desiredDepth: (prof?.desiredDepth as string) ?? "",
          timeAvailable: (prof?.timeAvailable as string) ?? "",
          focusAreas: (prof?.focusAreas as string[]) ?? [],
          rawTranscript: allMsgs.map((m) => ({ role: m.role, content: m.content })),
        });

        let newPhase: InterviewPhase = "active";
        let newProfile: LearnerIntentProfile | null = null;

        if (data.done && data.profile) {
          newProfile = buildProfile(data.profile);
          newPhase = "confirming";
          setProfile(newProfile);
          setPhase(newPhase);
        } else if (allMsgs.length >= MAX_MESSAGES) {
          newProfile = buildProfile();
          newPhase = "confirming";
          setProfile(newProfile);
          setPhase(newPhase);
        }

        // Persist to localStorage
        if (topicName) {
          saveToStorage(topicName, {
            messages: allMsgs,
            phase: newPhase !== "active" ? newPhase : phase === "idle" ? "active" : phase,
            profile: newProfile,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, phase, topicName]
  );

  /**
   * Append a final free-form note from the learner to the raw transcript.
   *
   * The labeled profile fields are a summary for UI display only. Downstream
   * agents read the full transcript, so last-minute additions/corrections go
   * in as an extra user turn at the tail of the conversation. This is the
   * feedback mechanism at the end of the interview.
   */
  const appendLearnerFeedback = useCallback((note: string) => {
    const trimmed = note.trim();
    if (!trimmed) return;
    const feedbackMsg: InterviewMessage = {
      id: `user-feedback-${Date.now()}`,
      role: "user",
      content: `[Additional context from the learner before we begin] ${trimmed}`,
    };
    setMessages((prev) => {
      const updated = [...prev, feedbackMsg];
      setProfile((existingProfile) => {
        if (!existingProfile) return existingProfile;
        const nextProfile = {
          ...existingProfile,
          rawTranscript: updated.map((m) => ({ role: m.role, content: m.content })),
        };
        if (topicName) {
          saveToStorage(topicName, {
            messages: updated,
            phase: "confirming",
            profile: nextProfile,
          });
        }
        return nextProfile;
      });
      return updated;
    });
  }, [topicName]);

  const confirmProfile = useCallback(() => {
    setPhase("complete");
    if (topicName) clearStorage(topicName);
  }, [topicName]);

  const reset = useCallback(() => {
    setMessages([]);
    setPhase("idle");
    setProfile(null);
    setError(null);
    setIsLoading(false);
    if (topicName) clearStorage(topicName);
  }, [topicName]);

  return {
    messages,
    phase,
    isLoading,
    profile,
    error,
    sendMessage,
    appendLearnerFeedback,
    confirmProfile,
    reset,
  };
}
