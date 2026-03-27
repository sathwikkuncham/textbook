import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <WifiOff className="size-16 text-muted-foreground/20" />
        <h1 className="font-serif text-2xl font-bold text-foreground">
          You're Offline
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Content you've previously viewed is available offline. Connect to the
          internet to access new topics or generate content.
        </p>
      </div>
    </div>
  );
}
