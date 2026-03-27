import { useEffect } from "react";

interface KeyboardShortcutOptions {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onToggleFocusMode?: () => void;
  focusMode?: boolean;
}

export function useKeyboardShortcuts({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onToggleFocusMode,
  focusMode,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+B — toggle left sidebar
      if (event.ctrlKey && !event.shiftKey && event.key === "b") {
        event.preventDefault();
        onToggleLeftSidebar();
      }

      // Ctrl+L — toggle right sidebar
      if (event.ctrlKey && !event.shiftKey && event.key === "l") {
        event.preventDefault();
        onToggleRightSidebar();
      }

      // Ctrl+Shift+F — toggle focus mode
      if (event.ctrlKey && event.shiftKey && event.key === "F") {
        event.preventDefault();
        onToggleFocusMode?.();
      }

      // Escape — exit focus mode (only when in focus mode)
      if (event.key === "Escape" && focusMode && onToggleFocusMode) {
        onToggleFocusMode();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleLeftSidebar, onToggleRightSidebar, onToggleFocusMode, focusMode]);
}
