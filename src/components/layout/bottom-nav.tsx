"use client";

import { BookOpen, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "contents" | "learn" | "chat";

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  chatBadge?: boolean;
}

const TABS: Array<{ id: MobileTab; label: string; icon: React.ElementType }> = [
  { id: "contents", label: "Contents", icon: BookOpen },
  { id: "learn", label: "Learn", icon: FileText },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

export function BottomNav({ activeTab, onTabChange, chatBadge }: BottomNavProps) {
  return (
    <nav
      className="flex shrink-0 items-stretch border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <Icon className={cn("size-5", isActive && "fill-primary/15")} />
            <span className={cn("text-[10px]", isActive && "font-semibold")}>
              {tab.label}
            </span>
            {tab.id === "chat" && chatBadge && (
              <span className="absolute right-1/4 top-1.5 size-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
