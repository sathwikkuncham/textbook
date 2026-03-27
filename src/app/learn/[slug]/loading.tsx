export default function WorkspaceLoading() {
  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden">
      {/* Top bar skeleton */}
      <div className="flex h-12 shrink-0 items-center border-b border-border bg-card px-2 md:px-4">
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <div className="ml-1.5 flex items-center gap-1.5 md:ml-2 md:gap-2">
          <div className="h-5 w-8 animate-pulse rounded bg-muted" />
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="ml-2 flex items-center gap-1.5 md:ml-6 md:gap-2">
          <div className="hidden h-3 w-12 animate-pulse rounded bg-muted md:block" />
          <div className="h-2 w-16 animate-pulse rounded-full bg-muted md:w-32" />
          <div className="h-3 w-8 animate-pulse rounded bg-muted" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="hidden size-8 animate-pulse rounded-lg bg-muted md:block" />
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar skeleton */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-border bg-sidebar">
          {/* Sidebar header */}
          <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-3">
            <div className="size-5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          {/* Module items */}
          <div className="flex-1 space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-2.5"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 size-4 shrink-0 animate-pulse rounded bg-muted" />
                  <div className="mt-0.5 size-4 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className="h-4 animate-pulse rounded bg-muted"
                      style={{ width: `${65 + i * 5}%` }}
                    />
                    {i === 0 && (
                      <div className="space-y-1.5 pl-2">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <div key={j} className="flex items-center gap-2 py-1">
                            <div className="size-4 shrink-0 animate-pulse rounded-full bg-muted" />
                            <div
                              className="h-3.5 animate-pulse rounded bg-muted"
                              style={{ width: `${55 + j * 12}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {i !== 0 && (
                    <div className="mt-0.5 h-4 w-8 shrink-0 animate-pulse rounded bg-muted" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Sidebar footer */}
          <div className="border-t border-sidebar-border px-4 py-2.5">
            <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Center panel skeleton */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-8 md:py-6">
            {/* Heading */}
            <div className="mb-6 border-b border-border pb-3">
              <div className="h-7 w-3/5 animate-pulse rounded bg-muted" />
            </div>
            {/* Paragraphs */}
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            </div>
            {/* Subheading */}
            <div className="mb-3 mt-10 h-5 w-2/5 animate-pulse rounded bg-muted" />
            {/* More paragraphs */}
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
            </div>
            {/* Code block */}
            <div className="mt-4 h-32 w-full animate-pulse rounded-lg border border-border bg-muted/50" />
            {/* More paragraphs */}
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="flex w-[320px] shrink-0 flex-col border-l border-border bg-sidebar">
          {/* Chat header */}
          <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
            <div className="size-4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-14 animate-pulse rounded bg-muted" />
          </div>
          {/* Empty chat body */}
          <div className="flex-1" />
        </div>
      </div>

      {/* Status bar skeleton */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-muted/50 px-3">
        <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
