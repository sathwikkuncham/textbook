import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
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
          "max-w-[85%] rounded-2xl text-sm",
          isUser
            ? "rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
            : "rounded-bl-md bg-muted/60 px-4 py-3 text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <div className="chat-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 leading-[1.7] text-foreground/90">{children}</p>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-sm font-semibold text-foreground first:mt-0">{children}</h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-foreground/70">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-2 border-l-2 border-primary/30 pl-3 text-foreground/70 italic">
                    {children}
                  </blockquote>
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
                      <code className="block whitespace-pre-wrap rounded-lg bg-background/80 p-3 font-mono text-xs leading-relaxed text-foreground/90">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="rounded-md bg-background/50 px-1.5 py-0.5 font-mono text-[13px] text-foreground/90">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-3 overflow-x-auto">{children}</pre>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0 marker:text-muted-foreground/40">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0 marker:text-muted-foreground/60">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-[1.7] text-foreground/90">{children}</li>
                ),
                hr: () => <hr className="my-3 border-border/50" />,
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-b border-border/50 bg-background/50 px-2.5 py-1.5 text-left font-semibold text-foreground/80">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-border/30 px-2.5 py-1.5 text-foreground/80">{children}</td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-4 w-1 animate-pulse rounded-full bg-primary" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
