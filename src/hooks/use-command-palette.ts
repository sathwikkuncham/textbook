"use client";

import { createContext, useContext } from "react";

interface CommandPaletteContext {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const CommandPaletteCtx = createContext<CommandPaletteContext>({
  open: false,
  setOpen: () => {},
});

export function useCommandPalette() {
  return useContext(CommandPaletteCtx);
}
