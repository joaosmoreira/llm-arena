"use client";

import * as React from "react";
import {
  Sparkles,
  Clock,
  Zap,
  Coins,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/infrastructure/ui-kit/card";
import { Button } from "@/infrastructure/ui-kit/button";
import { Skeleton } from "@/infrastructure/ui-kit/skeleton";
import { MarkdownRenderer } from "@/components/arena/markdown-renderer";

export interface ModelResponseCardProps {
  id: string;
  name: string;
  letter: string;
  fullName: string;
  response: string;
  status?: "IDLE" | "STREAMING" | "COMPLETED" | "FAILED";
  ttftMs?: number | null;
  tokensPerSec?: number | null;
  totalTokens?: number;
  costUsd?: number;
  errorMessage?: string | null;
  isWinner?: boolean;
  canVote?: boolean;
  onVote?: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function ResponseCard({
  id,
  name,
  letter,
  fullName,
  response,
  status = "COMPLETED",
  ttftMs = null,
  tokensPerSec = null,
  totalTokens = 0,
  costUsd = 0,
  errorMessage = null,
  isWinner = false,
  canVote = true,
  onVote,
  onRetry,
}: ModelResponseCardProps) {
  const [metricsOpen, setMetricsOpen] = React.useState(true);
  const isFailed = status === "FAILED" || !!errorMessage;
  const isStreaming = status === "STREAMING" && !errorMessage;

  return (
    <Card
      className={`flex flex-col transition-all duration-200 ${
        isWinner
          ? "border-winner/70 ring-winner/40 bg-card shadow-lg ring-2"
          : isFailed
            ? "border-destructive/50 bg-card/90"
            : isStreaming
              ? "border-primary/50 shadow-sm"
              : "border-border bg-card hover:border-border/80"
      }`}
    >
      {/* Header: Initial Circle, Model Name, Model ID, and Winner Badge / Vote Button */}
      <CardHeader className="border-border/40 flex flex-row items-center justify-between space-y-0 border-b pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
              isWinner
                ? "bg-winner text-winner-foreground shadow-sm"
                : isFailed
                  ? "bg-destructive/20 text-destructive"
                  : isStreaming
                    ? "bg-primary/20 text-primary animate-pulse"
                    : "bg-muted text-foreground"
            }`}
          >
            {letter}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-semibold">{name}</CardTitle>
            <p className="text-muted-foreground max-w-[140px] truncate font-mono text-[10px]">
              {fullName}
            </p>
          </div>
        </div>

        {/* Voting or State Affordance */}
        {isWinner ? (
          <Button
            variant="winner"
            size="sm"
            className="h-7 cursor-pointer gap-1 px-2.5 text-xs font-semibold shadow-sm"
            onClick={() => onVote?.(id)}
            title="Winner"
          >
            <Sparkles className="size-3" /> Winner
          </Button>
        ) : isStreaming ? (
          <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
            <Loader2 className="text-primary size-3.5 animate-spin" />
            <span className="text-[11px]">Streaming...</span>
          </div>
        ) : isFailed ? (
          onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 h-7 cursor-pointer gap-1 px-2 text-xs"
              onClick={() => onRetry(id)}
            >
              <RotateCcw className="size-3" /> Try again
            </Button>
          ) : null
        ) : canVote && onVote ? (
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 hover:bg-primary hover:text-primary-foreground hover:border-primary h-7 cursor-pointer text-xs font-medium transition-colors"
            onClick={() => onVote(id)}
          >
            Pick this
          </Button>
        ) : null}
      </CardHeader>

      {/* Body: Formatted Response or Error or Skeleton */}
      <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-4">
        {isFailed ? (
          <div className="border-destructive/30 bg-destructive/10 text-foreground space-y-2 rounded-lg border p-3 text-xs">
            <div className="text-destructive flex items-center gap-1.5 font-semibold">
              <AlertCircle className="size-4" />
              <span>Model Encountered an Issue</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {errorMessage || "Unable to reach this model. Please try again."}
            </p>
          </div>
        ) : isStreaming && !response ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <div className="flex-1">
            <MarkdownRenderer content={response} isStreaming={isStreaming} />
          </div>
        )}

        {/* Expandable Live Metrics Drawer */}
        <div className="border-border/60 bg-muted/30 space-y-2 rounded-md border p-2.5">
          <button
            type="button"
            onClick={() => setMetricsOpen((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-between text-[11px]"
            aria-expanded={metricsOpen}
          >
            <span className="flex items-center gap-1 font-medium">
              {metricsOpen ? (
                <ChevronUp className="text-primary size-3" />
              ) : (
                <ChevronDown className="text-primary size-3" />
              )}
              Live Metrics
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {totalTokens > 0
                ? `${totalTokens} tokens`
                : isStreaming
                  ? "measuring..."
                  : "0 tokens"}
            </span>
          </button>

          {metricsOpen && (
            <div className="border-border/30 grid grid-cols-3 gap-2 border-t pt-1 font-mono text-[11px]">
              <div>
                <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Clock className="text-muted-foreground size-3" /> TTFT
                </div>
                <div className="text-foreground font-semibold">
                  {ttftMs !== null && ttftMs !== undefined ? `${ttftMs}ms` : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Zap className="text-muted-foreground size-3" /> Speed
                </div>
                <div className="text-foreground font-semibold">
                  {tokensPerSec !== null && tokensPerSec !== undefined
                    ? `${tokensPerSec} tok/s`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Coins className="text-muted-foreground size-3" /> Cost
                </div>
                <div className="text-foreground font-semibold">${costUsd.toFixed(4)}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
