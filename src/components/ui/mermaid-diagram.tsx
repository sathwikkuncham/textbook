"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, ZoomIn, ZoomOut, X } from "lucide-react";
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
  // Extract width and height from the SVG tag
  const widthMatch = svgString.match(/\bwidth="([^"]+)"/);
  const heightMatch = svgString.match(/\bheight="([^"]+)"/);

  if (!widthMatch || !heightMatch) return svgString;

  const w = parseFloat(widthMatch[1]);
  const h = parseFloat(heightMatch[1]);

  if (isNaN(w) || isNaN(h)) return svgString;

  // Check if viewBox already exists
  const hasViewBox = /\bviewBox="/.test(svgString);

  let result = svgString;

  // Add viewBox if missing
  if (!hasViewBox) {
    result = result.replace("<svg", `<svg viewBox="0 0 ${w} ${h}"`);
  }

  // Replace fixed width/height with responsive values
  result = result
    .replace(/\bwidth="[^"]*"/, 'width="100%"')
    .replace(/\bheight="[^"]*"/, 'height="100%"');

  // Add preserveAspectRatio if not present
  if (!/preserveAspectRatio/.test(result)) {
    result = result.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return result;
}

let mermaidInitialized = false;

async function initMermaid() {
  if (mermaidInitialized) return;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: {
      primaryColor: "#f5f4ee",
      primaryTextColor: "#3d3929",
      primaryBorderColor: "#dad9d4",
      lineColor: "#c96442",
      secondaryColor: "#e9e6dc",
      tertiaryColor: "#ede9de",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: "14px",
    },
    flowchart: {
      htmlLabels: false,
      curve: "basis",
      padding: 12,
    },
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
}

export function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        await initMermaid();
        const mermaid = (await import("mermaid")).default;
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

        // Sanitize: strip HTML tags that Gemini sometimes generates in labels
        const sanitized = chart
          .replace(/<br\s*\/?>/gi, "\\n")
          .replace(/<[^>]+>/g, "");

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
  }, [chart]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
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
          className="absolute right-2 top-2 rounded-md bg-card/80 p-1.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-muted"
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
            className="relative mx-4 flex h-[85vh] w-[85vw] flex-col rounded-xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="size-4" />
                </Button>
              </div>
              {caption && (
                <span className="text-sm text-muted-foreground">
                  {caption}
                </span>
              )}
              <Button variant="ghost" size="icon-sm" onClick={closeModal}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto p-6">
              <div
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                className="flex h-full w-full items-center justify-center transition-transform duration-200"
                dangerouslySetInnerHTML={{ __html: makeResponsiveSvg(svg) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
