export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-6 w-20 animate-pulse rounded bg-muted md:h-7" />
          </div>
          <div className="flex items-center gap-2">
            <div className="size-8 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {/* "Continue Learning" heading skeleton */}
        <div className="mb-8">
          <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-56 animate-pulse rounded bg-muted md:h-9" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>

        {/* Continue card skeleton */}
        <div className="mb-8 flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="size-16 shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            <div className="h-5 w-64 animate-pulse rounded bg-muted" />
            <div className="flex gap-4">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-10 w-28 shrink-0 animate-pulse rounded-xl bg-muted" />
        </div>

        {/* Topic grid skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex flex-1 flex-col p-6">
                {/* Top row */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="size-4 animate-pulse rounded bg-muted" />
                </div>
                {/* Title */}
                <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
                {/* Level */}
                <div className="mb-1 h-3 w-16 animate-pulse rounded bg-muted" />
                {/* Spacer */}
                <div className="min-h-3 flex-1" />
                {/* Bottom metadata */}
                <div className="flex items-center gap-4 border-t border-border/50 pt-3">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-14 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
