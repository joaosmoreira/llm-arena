"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, Check, Copy, ChevronRight } from "lucide-react";

interface MarkdownRendererProps {
  readonly content: string;
  readonly isStreaming?: boolean;
}

/**
 * Separate thinking/reasoning process from the final answer.
 * Handles <think> tags, Nemotron-style thinking intros, and internal reasoning monologues.
 */
function parseThinkingAndContent(rawText: string): {
  thinking: string | null;
  mainContent: string;
} {
  if (!rawText) return { thinking: null, mainContent: "" };

  // 1. Check for complete <think>...</think>
  const thinkTagMatch = rawText.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/i);
  if (thinkTagMatch) {
    return {
      thinking: thinkTagMatch[1].trim() || null,
      mainContent: thinkTagMatch[2].trim(),
    };
  }

  // 2. Check for streaming/unclosed <think>
  const unclosedThinkMatch = rawText.match(/^<think>([\s\S]*)$/i);
  if (unclosedThinkMatch) {
    return {
      thinking: unclosedThinkMatch[1].trim() || null,
      mainContent: "",
    };
  }

  // 3. Check for Nemotron/Cohere-style reasoning monologue:
  // "Here's a thinking process: ... Output: ..." or "The user asks: ... The system says: ... [Answer]"
  const nemotronMatch = rawText.match(
    /^Here(?:'s| is) a thinking process:?([\s\S]*?)(?:\n\n---\n\n|\n\n(?=[#*`A-Z])|\n\n(?:Final Output|Output):\s*)([\s\S]*)$/i
  );
  if (nemotronMatch && nemotronMatch[2]?.trim()) {
    return {
      thinking: `Here's a thinking process:${nemotronMatch[1].trim()}`,
      mainContent: nemotronMatch[2].trim(),
    };
  }

  // 4. Check for system deliberation preamble (e.g. "The user asks:... The system says:... So we comply: ...")
  const cohereDelibMatch = rawText.match(
    /^(?:The user asks:[\s\S]*?So we comply:[^\n]*\n*)([\s\S]*)$/i
  );
  if (cohereDelibMatch && cohereDelibMatch[1]?.trim()) {
    const thinkingPart = rawText.slice(0, rawText.length - cohereDelibMatch[1].length).trim();
    return {
      thinking: thinkingPart || null,
      mainContent: cohereDelibMatch[1].trim(),
    };
  }

  return { thinking: null, mainContent: rawText };
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const textContent = String(children || "").replace(/\n$/, "");
  const language = className ? className.replace(/language-/, "") : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="border-border/60 bg-muted/40 my-3.5 overflow-hidden rounded-lg border shadow-xs">
      <div className="border-border/40 bg-muted/70 flex items-center justify-between border-b px-3.5 py-1.5 text-[11px]">
        <span className="text-muted-foreground font-mono font-medium lowercase">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="text-winner size-3.5" />
              <span className="text-winner text-[11px] font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-foreground overflow-x-auto p-3.5 font-mono text-[12px] leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
  const { thinking, mainContent } = React.useMemo(
    () => parseThinkingAndContent(content),
    [content]
  );
  const [thinkingOpen, setThinkingOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Collapsible Thinking / Reasoning Section */}
      {thinking && (
        <div className="border-border/50 bg-muted/20 overflow-hidden rounded-lg border text-xs">
          <button
            type="button"
            onClick={() => setThinkingOpen((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left font-mono text-[11px] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Brain className="text-primary size-3.5" />
              <span className="font-semibold">Thought Process</span>
              <span className="text-muted-foreground/60 text-[10px]">
                ({thinking.length} chars)
              </span>
            </span>
            <ChevronRight
              className={`size-3.5 transition-transform duration-200 ${
                thinkingOpen ? "text-primary rotate-90" : "text-muted-foreground"
              }`}
            />
          </button>

          {thinkingOpen && (
            <div className="border-border/30 text-muted-foreground/80 border-t px-3.5 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {thinking}
            </div>
          )}
        </div>
      )}

      {/* Main Formatted Markdown Content with Enhanced Readability */}
      <div className="text-foreground/90 font-sans text-[13px] leading-[1.65] break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-foreground/90 mb-3 text-[13px] leading-[1.65] last:mb-0">
                {children}
              </p>
            ),
            h1: ({ children }) => (
              <h1 className="text-foreground mt-5 mb-2.5 text-base font-bold tracking-tight first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-foreground mt-4 mb-2 text-sm font-semibold tracking-tight first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-foreground mt-3.5 mb-1.5 text-[13px] font-semibold first:mt-0">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-foreground mt-3 mb-1 text-[12.5px] font-medium first:mt-0">
                {children}
              </h4>
            ),
            ul: ({ children }) => (
              <ul className="text-foreground/90 my-2.5 list-disc space-y-1.5 pl-5 text-[13px]">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="text-foreground/90 my-2.5 list-decimal space-y-1.5 pl-5 text-[13px]">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
            strong: ({ children }) => (
              <strong className="text-foreground font-semibold">{children}</strong>
            ),
            em: ({ children }) => <em className="text-foreground/90 italic">{children}</em>,
            blockquote: ({ children }) => (
              <blockquote className="border-primary/60 bg-muted/20 text-muted-foreground my-3 rounded-r-md border-l-3 px-3.5 py-2 text-[12.5px] italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="border-border/60 my-4" />,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="border-border/60 my-3.5 overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-left text-xs">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted/70 text-foreground border-border/60 border-b font-semibold">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="text-foreground border-border/40 border-r px-3.5 py-2 font-semibold last:border-r-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="text-foreground/85 border-border/30 border-border/30 border-t border-r px-3.5 py-2 last:border-r-0">
                {children}
              </td>
            ),
            code: ({ className, children, ...props }) => {
              const isMultiline = String(children || "").includes("\n");
              if (isMultiline || className) {
                return <CodeBlock className={className}>{children}</CodeBlock>;
              }
              return (
                <code
                  className="bg-muted/80 text-primary rounded px-1.5 py-0.5 font-mono text-[12px] font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <>{children}</>,
          }}
        >
          {mainContent || (thinking && isStreaming ? "_Reasoning in progress..._" : "")}
        </ReactMarkdown>

        {isStreaming && (
          <span className="bg-primary ml-1 inline-block h-4 w-1 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
