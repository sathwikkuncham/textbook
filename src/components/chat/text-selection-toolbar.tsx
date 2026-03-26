"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Layers, Minimize2 } from "lucide-react";
import { createPortal } from "react-dom";

interface TextSelectionToolbarProps {
  articleRef: React.RefObject<HTMLElement | null>;
  onAction: (action: "explain" | "go_deeper" | "simplify", selectedText: string) => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export function TextSelectionToolbar({
  articleRef,
  onAction,
}: TextSelectionToolbarProps) {
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    // Check if selection is inside the article
    const range = selection.getRangeAt(0);
    if (
      !articleRef.current ||
      !articleRef.current.contains(range.commonAncestorContainer)
    ) {
      setPosition(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setPosition(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY - 48,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setSelectedText(text);
  }, [articleRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleAction = (action: "explain" | "go_deeper" | "simplify") => {
    if (selectedText) {
      onAction(action, selectedText);
      window.getSelection()?.removeAllRanges();
      setPosition(null);
    }
  };

  if (!position || !selectedText) return null;

  return createPortal(
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
      }}
    >
      <button
        onClick={() => handleAction("explain")}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-popover-foreground transition-colors hover:bg-muted"
      >
        <BookOpen className="size-3" />
        Explain
      </button>
      <button
        onClick={() => handleAction("go_deeper")}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-popover-foreground transition-colors hover:bg-muted"
      >
        <Layers className="size-3" />
        Go Deeper
      </button>
      <button
        onClick={() => handleAction("simplify")}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-popover-foreground transition-colors hover:bg-muted"
      >
        <Minimize2 className="size-3" />
        Simplify
      </button>
    </div>,
    document.body
  );
}
