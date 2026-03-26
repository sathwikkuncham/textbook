import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SidebarRight() {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
        <MessageSquare className="size-4 text-sidebar-foreground/70" />
        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70">
          AI Chat
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex h-full items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">AI Chat Panel</p>
        </div>
      </ScrollArea>
    </div>
  );
}
