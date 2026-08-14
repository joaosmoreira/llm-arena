"use client";

import * as React from "react";
import { Sparkles, Clock, Zap, Coins, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ModelResponseCardProps {
  id: string;
  name: string;
  letter: string;
  fullName: string;
  response: string;
  ttftMs: number;
  tokensPerSec: number;
  totalTokens: number;
  costUsd?: number;
  isWinner: boolean;
  onVote: (id: string) => void;
}

export function ResponseCard({
  id,
  name,
  letter,
  fullName,
  response,
  ttftMs,
  tokensPerSec,
  totalTokens,
  costUsd = 0,
  isWinner,
  onVote,
}: ModelResponseCardProps) {
  const [metricsOpen, setMetricsOpen] = React.useState(true);

  return (
    <Card
      className={`flex flex-col transition-all duration-200 ${
        isWinner
          ? "border-winner/60 ring-winner/40 bg-card shadow-lg ring-2"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      {/* Header: Initial Circle, Model Name, Model ID, and Winner Badge / Vote Button */}
      <CardHeader className="border-border/40 flex flex-row items-center justify-between space-y-0 border-b pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
              isWinner ? "bg-winner text-winner-foreground shadow-sm" : "bg-muted text-foreground"
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

        {/* Voting affordance */}
        {isWinner ? (
          <Button
            variant="winner"
            size="sm"
            className="h-7 cursor-pointer gap-1 px-2.5 text-xs font-semibold shadow-sm"
            onClick={() => onVote(id)}
            title="Click to remove vote"
          >
            <Sparkles className="size-3" /> Winner
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 hover:bg-primary hover:text-primary-foreground hover:border-primary h-7 cursor-pointer text-xs transition-colors"
            onClick={() => onVote(id)}
          >
            Vote
          </Button>
        )}
      </CardHeader>

      {/* Body: Formatted Response */}
      <CardContent className="flex flex-1 flex-col justify-between space-y-4 pt-4">
        <p className="text-foreground/90 font-sans text-xs leading-relaxed whitespace-pre-wrap">
          {response}
        </p>

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
              {totalTokens} tokens
            </span>
          </button>

          {metricsOpen && (
            <div className="border-border/30 grid grid-cols-3 gap-2 border-t pt-1 font-mono text-[11px]">
              <div>
                <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Clock className="text-muted-foreground size-3" /> TTFT
                </div>
                <div className="text-foreground font-semibold">{ttftMs}ms</div>
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                  <Zap className="text-muted-foreground size-3" /> Speed
                </div>
                <div className="text-foreground font-semibold">{tokensPerSec} tok/s</div>
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
