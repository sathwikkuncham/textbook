"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

/**
 * Strip hardcoded width/height from Mermaid SVGs and ensure viewBox is set
 * so the SVG scales responsively to fill available space.
 */
function makeResponsiveSvg(svgString: string): string {
  const widthMatch = svgString.match(/\bwidth="([^"]+)"/);
  const heightMatch = svgString.match(/\bheight="([^"]+)"/);

  if (!widthMatch || !heightMatch) return svgString;

  const w = parseFloat(widthMatch[1]);
  const h = parseFloat(heightMatch[1]);

  if (isNaN(w) || isNaN(h)) return svgString;

  const hasViewBox = /\bviewBox="/.test(svgString);

  let result = svgString;

  if (!hasViewBox) {
    result = result.replace("<svg", `<svg viewBox="0 0 ${w} ${h}"`);
  }

  result = result
    .replace(/\bwidth="[^"]*"/, 'width="100%"')
    .replace(/\bheight="[^"]*"/, 'height="100%"');

  if (!/preserveAspectRatio/.test(result)) {
    result = result.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return result;
}

/** Read CSS custom properties from the active theme to style Mermaid diagrams. */
function getThemeVariables(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string, fallback: string) =>
    style.getPropertyValue(prop).trim() || fallback;

  return {
    primaryColor: get("--card", "#faf9f5"),
    primaryTextColor: get("--foreground", "#3d3929"),
    primaryBorderColor: get("--border", "#dad9d4"),
    lineColor: get("--primary", "#c96442"),
    secondaryColor: get("--secondary", "#e9e6dc"),
    tertiaryColor: get("--muted", "#ede9de"),
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontSize: "14px",
  };
}

let lastInitializedTheme: string | null = null;

async function initMermaid(resolvedTheme: string | undefined) {
  const themeKey = resolvedTheme ?? "light";
  if (lastInitializedTheme === themeKey) return;

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: getThemeVariables(),
    flowchart: {
      htmlLabels: false,
      curve: "basis",
      padding: 12,
    },
    suppressErrorRendering: true,
  });
  lastInitializedTheme = themeKey;
}

export function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        await initMermaid(resolvedTheme);
        const mermaid = (await import("mermaid")).default;
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

        const sanitized = chart
          .replace(/<br\s*\/?>/gi, "\\n")
          .replace(/<[^>]+>/g, "")
          .replace(/`/g, "'")
          // Strip inline style directives — they hardcode light-mode colors
          // that become unreadable in dark mode. Theme variables handle styling.
          .replace(/^\s*style\s+\S+\s+.*$/gm, "");

        const { svg: renderedSvg } = await mermaid.render(id, sanitized);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Diagram render failed");
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const openModal = useCallback(() => {
    setZoom(1);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setZoom(1);
  }, []);

  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          Diagram could not be rendered
        </p>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mb-4 flex h-32 items-center justify-center rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading diagram...</p>
      </div>
    );
  }

  return (
    <>
      <div className="group relative mb-4 rounded-lg border border-border bg-card p-4">
        <div
          ref={containerRef}
          className="flex justify-center overflow-hidden"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {caption && (
          <p className="mt-2 text-center text-xs italic text-muted-foreground">
            {caption}
          </p>
        )}
        <button
          onClick={openModal}
          className="absolute right-2 top-2 rounded-md bg-card/80 p-2 shadow-sm backdrop-blur transition-opacity hover:bg-muted md:opacity-0 md:group-hover:opacity-100"
          title="Expand diagram"
        >
          <Maximize2 className="size-4 text-muted-foreground" />
        </button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative flex h-[95dvh] w-[95vw] flex-col rounded-xl bg-card shadow-2xl md:h-[85vh] md:w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 md:px-4 md:py-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleResetZoom}
                  disabled={zoom === 1}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
              {caption && (
                <span className="mx-2 hidden text-sm text-muted-foreground md:inline">
                  {caption}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Scrollable + zoomable diagram area */}
            <div className="flex-1 overflow-auto overscroll-contain">
              <div
                style={{
                  width: `${zoom * 100}%`,
                  height: `${zoom * 100}%`,
                  minWidth: "100%",
                  minHeight: "100%",
                }}
                className="flex items-center justify-center p-4 md:p-6"
                dangerouslySetInnerHTML={{ __html: makeResponsiveSvg(svg) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
