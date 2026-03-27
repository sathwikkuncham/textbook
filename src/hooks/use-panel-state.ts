import { useCallback, useRef, useState } from "react";

interface PanelState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  focusMode: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleFocusMode: () => void;
}

export function usePanelState(): PanelState {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Store panel state before entering focus mode so we can restore it
  const savedState = useRef({ left: false, right: false });

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarOpen((prev) => !prev);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setRightSidebarOpen((prev) => !prev);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      if (!prev) {
        // Entering focus mode — save current state, collapse both
        savedState.current = {
          left: leftSidebarOpen,
          right: rightSidebarOpen,
        };
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        // Exiting focus mode — restore previous state
        setLeftSidebarOpen(savedState.current.left);
        setRightSidebarOpen(savedState.current.right);
      }
      return !prev;
    });
  }, [leftSidebarOpen, rightSidebarOpen]);

  return {
    leftSidebarOpen,
    rightSidebarOpen,
    focusMode,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftSidebarOpen,
    setRightSidebarOpen,
    toggleFocusMode,
  };
}
