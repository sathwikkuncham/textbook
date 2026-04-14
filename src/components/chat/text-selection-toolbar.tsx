"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function TextSelectionToolbar({
  articleRef,
  onAction,
}: TextSelectionToolbarProps) {
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      // On mobile, delay hiding to let the user interact with native menu first
      if (isMobile) {
        debounceRef.current = setTimeout(() => {
          setVisible(false);
          setSelectedText("");
        }, 300);
      } else {
        setPosition(null);
        setSelectedText("");
      }
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const range = selection.getRangeAt(0);
    if (
      !articleRef.current ||
      !articleRef.current.contains(range.commonAncestorContainer)
    ) {
      setPosition(null);
      setVisible(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setPosition(null);
      setVisible(false);
      return;
    }

    setSelectedText(text);

    if (isMobile) {
      // On mobile: show as bottom bar after a brief delay
      // so the native context menu appears first and doesn't overlap
      debounceRef.current = setTimeout(() => setVisible(true), 400);
    } else {
      // On desktop: float above the selection
      const rect = range.getBoundingClientRect();
      setPosition({
        top: rect.top - 48,
        left: rect.left + rect.width / 2,
      });
    }
  }, [articleRef, isMobile]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      window.getSelection()?.removeAllRanges();
      setPosition(null);
      setVisible(false);
      setSelectedText("");
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleKeyDown);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [handleSelectionChange, handleKeyDown]);

  const handleAction = (action: "explain" | "go_deeper" | "simplify") => {
    if (selectedText) {
      onAction(action, selectedText);
      window.getSelection()?.removeAllRanges();
      setPosition(null);
      setVisible(false);
    }
  };

  // Mobile: fixed bottom bar
  if (isMobile) {
    if (!visible || !selectedText) return null;

    return createPortal(
      <div
        role="toolbar"
        aria-label="Text selection actions"
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t border-border bg-popover px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => handleAction("explain")}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-popover-foreground active:bg-muted/70"
        >
          <BookOpen className="size-3.5" />
          Explain
        </button>
        <button
          onClick={() => handleAction("go_deeper")}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-popover-foreground active:bg-muted/70"
        >
          <Layers className="size-3.5" />
          Deeper
        </button>
        <button
          onClick={() => handleAction("simplify")}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-popover-foreground active:bg-muted/70"
        >
          <Minimize2 className="size-3.5" />
          Simplify
        </button>
      </div>,
      document.body
    );
  }

  // Desktop: floating above selection
  if (!position || !selectedText) return null;

  return createPortal(
    <div
      role="toolbar"
      aria-label="Text selection actions"
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
      }}
    >
      <button
        onClick={() => handleAction("explain")}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-popover-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <BookOpen className="size-3" />
        Explain
      </button>
      <button
        onClick={() => handleAction("go_deeper")}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-popover-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Layers className="size-3" />
        Go Deeper
      </button>
      <button
        onClick={() => handleAction("simplify")}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-popover-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Minimize2 className="size-3" />
        Simplify
      </button>
    </div>,
    document.body
  );
}
