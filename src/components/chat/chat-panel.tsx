"use client";

import { useRef, useEffect, useState } from "react";
import { MessageSquare, Send, Loader2, Plus, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./chat-message";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  topicId: number | null;
  topic: string | null;
  topicSlug: string | null;
  moduleId: number | null;
  subtopicId: string | null;
  subtopicTitle?: string;
  pendingAction?: {
    action: string;
    selectedText: string;
  } | null;
  onPendingActionConsumed?: () => void;
}

export function ChatPanel({
  topicId,
  topic,
  topicSlug,
  moduleId,
  subtopicId,
  subtopicTitle,
  pendingAction,
  onPendingActionConsumed,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
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
  } = useChat({ topicId, topic, topicSlug, moduleId, subtopicId });

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  // Handle pending text selection action
  useEffect(() => {
    if (pendingAction && !isStreaming) {
      sendMessage(
        pendingAction.selectedText,
        pendingAction.action,
        pendingAction.selectedText
      );
      onPendingActionConsumed?.();
    }
  }, [pendingAction, isStreaming, sendMessage, onPendingActionConsumed]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const isDisabled = !topicId || !subtopicId;

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header with session controls */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-sidebar-foreground/70" />
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
            AI Chat
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={startNewSession}
          disabled={isDisabled}
          title="New conversation"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Session selector */}
      {sessions.length > 0 && (
        <div className="border-b border-sidebar-border">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
          >
            <span className="truncate">
              {activeSession?.title ?? "New Chat"}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </span>
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  showSessions && "rotate-180"
                )}
              />
            </div>
          </button>
          {showSessions && (
            <div className="max-h-40 overflow-y-auto border-t border-sidebar-border">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    selectSession(session.id);
                    setShowSessions(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-xs transition-colors",
                    session.id === activeSessionId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  <span className="truncate">{session.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context badge */}
      {subtopicTitle && (
        <div className="border-b border-sidebar-border px-3 py-1.5">
          <Badge
            variant="outline"
            className="text-[10px] text-muted-foreground"
          >
            {subtopicTitle}
          </Badge>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {isDisabled && (
            <div className="flex h-40 items-center justify-center">
              <p className="text-center text-xs text-muted-foreground">
                Select a subtopic to start chatting
              </p>
            </div>
          )}

          {!isDisabled && messages.length === 0 && !isLoadingHistory && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-center text-xs text-muted-foreground">
                Ask a question about this topic
              </p>
            </div>
          )}

          {isLoadingHistory && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))}

          {isStreaming && streamingContent && (
            <ChatMessage role="assistant" content={streamingContent} isStreaming />
          )}

          {error && (
            <p className="text-center text-xs text-destructive">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled ? "Select a subtopic first..." : "Ask about this topic..."
            }
            disabled={isDisabled || isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || isDisabled}
            className="h-auto shrink-0 px-3 py-2"
          >
            {isStreaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
