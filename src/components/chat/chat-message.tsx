import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                code: ({ className, children }) => {
                  const text = String(children).replace(/\n$/, "");
                  const isMermaid = className?.includes("language-mermaid")
                    || /^(graph\s+(TD|TB|BT|RL|LR)|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph)/m.test(text);
                  if (isMermaid && text.includes("\n")) {
                    return <MermaidDiagram chart={text} />;
                  }
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block whitespace-pre-wrap rounded bg-background/50 p-2 font-mono text-xs">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="rounded bg-background/30 px-1 py-0.5 font-mono text-xs">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-2 overflow-x-auto">{children}</pre>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
