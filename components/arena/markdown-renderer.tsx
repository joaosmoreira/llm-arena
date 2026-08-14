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
 * Handles <think> tags, Nemotron-style thinking intros, and raw reasoning tokens.
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

  // 3. Check for Nemotron-style intro: "Here's a thinking process: ... Output: ..."
  const nemotronMatch = rawText.match(
    /^Here(?:'s| is) a thinking process:([\s\S]*?)(?:\n\n(?=[A-Z0-9#*`])|\n\n---\n\n|\n\n(?:Final Output|Output):\s*)([\s\S]*)$/i
  );
  if (nemotronMatch && nemotronMatch[2]?.trim()) {
    return {
      thinking: nemotronMatch[1].trim() || null,
      mainContent: nemotronMatch[2].trim(),
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
    <div className="border-border/60 bg-muted/40 my-3 overflow-hidden rounded-lg border">
      <div className="border-border/40 bg-muted/70 flex items-center justify-between border-b px-3 py-1.5 text-[11px]">
        <span className="text-muted-foreground font-mono font-medium lowercase">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="text-winner size-3" />
              <span className="text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-foreground overflow-x-auto p-3 font-mono text-[12px] leading-relaxed">
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
    <div className="flex flex-col gap-2">
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
            <div className="border-border/30 text-muted-foreground/80 border-t px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {thinking}
            </div>
          )}
        </div>
      )}

      {/* Main Formatted Markdown Content */}
      <div className="prose prose-neutral dark:prose-invert text-foreground/90 max-w-none text-xs leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-foreground/90 mb-2.5 text-[12.5px] leading-relaxed last:mb-0">
                {children}
              </p>
            ),
            h1: ({ children }) => (
              <h1 className="text-foreground mt-4 mb-2 text-base font-bold first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-foreground mt-3.5 mb-1.5 text-sm font-semibold first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-foreground mt-3 mb-1 text-xs font-semibold first:mt-0">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-foreground mt-2 mb-1 text-xs font-medium first:mt-0">
                {children}
              </h4>
            ),
            ul: ({ children }) => (
              <ul className="text-foreground/90 my-2 list-disc space-y-1 pl-4 text-[12.5px]">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="text-foreground/90 my-2 list-decimal space-y-1 pl-4 text-[12.5px]">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => (
              <strong className="text-foreground font-semibold">{children}</strong>
            ),
            em: ({ children }) => <em className="text-foreground/90 italic">{children}</em>,
            blockquote: ({ children }) => (
              <blockquote className="border-primary/40 text-muted-foreground my-2.5 border-l-2 pl-3 italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="border-border/60 my-3" />,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto">
                <table className="border-border/60 w-full border-collapse border text-[11px]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
            th: ({ children }) => (
              <th className="border-border/60 text-foreground px-2.5 py-1.5 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-border/40 text-foreground/90 border px-2.5 py-1.5">
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
                  className="bg-muted/80 text-primary rounded px-1.5 py-0.5 font-mono text-[11px]"
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
          <span className="bg-primary ml-1 inline-block h-3.5 w-1 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
