"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "completing">("idle");
  const [width, setWidth] = useState(0);
  const prevUrlRef = useRef(`${pathname}?${searchParams}`);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams}`;

    if (currentUrl === prevUrlRef.current) return;

    // URL has changed — if we were loading, complete the bar
    if (state === "loading") {
      cleanup();
      setWidth(100);
      setState("completing");

      timeoutRef.current = setTimeout(() => {
        setState("idle");
        setWidth(0);
      }, 300);
    }

    prevUrlRef.current = currentUrl;
  }, [pathname, searchParams, state, cleanup]);

  // Listen for navigation start via click interception
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;

      // Internal navigation detected — start progress bar
      const currentUrl = `${pathname}?${searchParams}`;
      // Resolve the href to a full path for comparison
      const targetUrl = new URL(href, window.location.origin);
      const targetString = `${targetUrl.pathname}?${targetUrl.searchParams}`;

      if (targetString === currentUrl) return;

      cleanup();
      setState("loading");
      setWidth(15);

      // Incrementally grow to ~90%
      let current = 15;
      intervalRef.current = setInterval(() => {
        current += (90 - current) * 0.08;
        if (current >= 89.5) {
          current = 90;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
        setWidth(current);
      }, 100);
    }

    // Also listen for programmatic navigations via popstate
    function handlePopState() {
      cleanup();
      setState("loading");
      setWidth(15);

      let current = 15;
      intervalRef.current = setInterval(() => {
        current += (90 - current) * 0.08;
        if (current >= 89.5) {
          current = 90;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
        setWidth(current);
      }, 100);
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      cleanup();
    };
  }, [pathname, searchParams, cleanup]);

  if (state === "idle") return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[image:var(--gradient-primary)] transition-all duration-200 ease-out"
        style={{
          width: `${width}%`,
          opacity: state === "completing" ? 0 : 1,
          transition:
            state === "completing"
              ? "width 150ms ease-out, opacity 300ms ease-out"
              : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
