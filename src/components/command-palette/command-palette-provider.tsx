"use client";

import { useState, useEffect, useCallback } from "react";
import { CommandPaletteCtx } from "@/hooks/use-command-palette";
import { CommandPalette } from "./command-palette";

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CommandPaletteCtx value={{ open, setOpen }}>
      {children}
      <CommandPalette />
    </CommandPaletteCtx>
  );
}
