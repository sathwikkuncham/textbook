import { useEffect } from "react";

interface KeyboardShortcutOptions {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

export function useKeyboardShortcuts({
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === "b") {
        event.preventDefault();
        onToggleLeftSidebar();
      }

      if (event.ctrlKey && event.key === "l") {
        event.preventDefault();
        onToggleRightSidebar();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleLeftSidebar, onToggleRightSidebar]);
}
