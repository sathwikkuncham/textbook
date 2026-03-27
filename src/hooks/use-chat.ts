"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ChatSession {
  id: number;
  title: string;
  updatedAt: string;
}

interface UseChatParams {
  topicId: number | null;
  topic: string | null;
  topicSlug: string | null;
  moduleId: number | null;
  subtopicId: string | null;
}

export function useChat({ topicId, topic, topicSlug, moduleId, subtopicId }: UseChatParams) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load sessions when topic changes
  useEffect(() => {
    if (!topicId) {
      setSessions([]);
      setActiveSessionId(null);
      setMessages([]);
      return;
    }

    fetch(`/api/learn/chat?topicId=${topicId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions) {
          setSessions(data.sessions);
          // Auto-select most recent session
          if (data.sessions.length > 0) {
            setActiveSessionId(data.sessions[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
      })
      .catch(() => {});
  }, [topicId]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingHistory(true);

    fetch(`/api/learn/chat?topicId=${topicId}&sessionId=${activeSessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.messages) {
          setMessages(
            data.messages.map(
              (m: { id: number; role: string; content: string; createdAt: string }) => ({
                id: String(m.id),
                role: m.role as "user" | "assistant",
                content: m.content,
                createdAt: new Date(m.createdAt),
              })
            )
          );
        }
        setIsLoadingHistory(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [topicId, activeSessionId]);

  // Abort stream on cleanup
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [activeSessionId]);

  const startNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
  }, []);

  const selectSession = useCallback((sessionId: number) => {
    setActiveSessionId(sessionId);
  }, []);

  const sendMessage = useCallback(
    async (message: string, action?: string, selectedText?: string) => {
      if (!topicId || isStreaming) return;

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: action && selectedText
          ? `[${action === "go_deeper" ? "Go Deeper" : action === "simplify" ? "Simplify" : "Explain"}] "${selectedText.slice(0, 200)}${selectedText.length > 200 ? "..." : ""}"`
          : message,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent("");
      setError(null);

      try {
        const response = await fetch("/api/learn/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            topic,
            slug: topicSlug,
            sessionId: activeSessionId,
            moduleId,
            subtopicId,
            message: action && selectedText ? selectedText : message,
            history: messages.slice(-20).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            action,
            selectedText,
          }),
          signal: controller.signal,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                setIsStreaming(false);
                return;
              }
              if (parsed.done) {
                // Stream complete — update session ID if new
                if (parsed.sessionId && !activeSessionId) {
                  setActiveSessionId(parsed.sessionId);
                  // Auto-title: use first 50 chars of user message
                  const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
                  fetch("/api/learn/chat", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: parsed.sessionId, title }),
                  }).catch(() => {});
                  setSessions((prev) => [
                    { id: parsed.sessionId, title, updatedAt: new Date().toISOString() },
                    ...prev,
                  ]);
                }
                const assistantMsg: ChatMessage = {
                  id: `msg-${Date.now()}`,
                  role: "assistant",
                  content: accumulated,
                  createdAt: new Date(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStreamingContent("");
                setIsStreaming(false);
                return;
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingContent(accumulated);
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        // Fallback finalize
        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            { id: `msg-${Date.now()}`, role: "assistant", content: accumulated, createdAt: new Date() },
          ]);
        }
        setStreamingContent("");
        setIsStreaming(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Chat failed");
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [topicId, topic, activeSessionId, moduleId, subtopicId, messages, isStreaming]
  );

  return {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    startNewSession,
    selectSession,
    isLoadingHistory,
    error,
  };
}
