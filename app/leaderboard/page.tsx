"use client";

import * as React from "react";
import { Trophy, Clock, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { Button } from "@/infrastructure/ui-kit/button";
import { Progress } from "@/infrastructure/ui-kit/progress";

interface LeaderboardEntry {
  rank: number;
  modelId: string;
  name: string;
  letter: string;
  fullName: string;
  winRatePercent: number;
  wins: number;
  totalVotes: number;
  avgTtftMs: number;
  avgTokensPerSec: number;
}

const GLOBAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    modelId: "nemotron",
    name: "NVIDIA Nemotron 3.5",
    letter: "N",
    fullName: "nvidia/nemotron-3.5-lightning:free",
    winRatePercent: 71,
    wins: 507,
    totalVotes: 714,
    avgTtftMs: 186,
    avgTokensPerSec: 64,
  },
  {
    rank: 2,
    modelId: "qwen",
    name: "Qwen 2.5 72B",
    letter: "Q",
    fullName: "qwen/qwen-2.5-72b-instruct:free",
    winRatePercent: 58,
    wins: 412,
    totalVotes: 710,
    avgTtftMs: 312,
    avgTokensPerSec: 48,
  },
  {
    rank: 3,
    modelId: "llama",
    name: "Llama 3.3 70B",
    letter: "L",
    fullName: "meta-llama/llama-3.3-70b-instruct:free",
    winRatePercent: 52,
    wins: 368,
    totalVotes: 708,
    avgTtftMs: 245,
    avgTokensPerSec: 53,
  },
  {
    rank: 4,
    modelId: "mistral",
    name: "Mistral Nemo 12B",
    letter: "M",
    fullName: "mistralai/mistral-nemo:free",
    winRatePercent: 44,
    wins: 295,
    totalVotes: 670,
    avgTtftMs: 220,
    avgTokensPerSec: 58,
  },
  {
    rank: 5,
    modelId: "deepseek",
    name: "DeepSeek R1",
    letter: "D",
    fullName: "deepseek/deepseek-r1:free",
    winRatePercent: 41,
    wins: 270,
    totalVotes: 658,
    avgTtftMs: 450,
    avgTokensPerSec: 36,
  },
];

const PERSONAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    modelId: "nemotron",
    name: "NVIDIA Nemotron 3.5",
    letter: "N",
    fullName: "nvidia/nemotron-3.5-lightning:free",
    winRatePercent: 67,
    wins: 4,
    totalVotes: 6,
    avgTtftMs: 184,
    avgTokensPerSec: 64,
  },
  {
    rank: 2,
    modelId: "qwen",
    name: "Qwen 2.5 72B",
    letter: "Q",
    fullName: "qwen/qwen-2.5-72b-instruct:free",
    winRatePercent: 33,
    wins: 2,
    totalVotes: 6,
    avgTtftMs: 312,
    avgTokensPerSec: 48,
  },
  {
    rank: 3,
    modelId: "llama",
    name: "Llama 3.3 70B",
    letter: "L",
    fullName: "meta-llama/llama-3.3-70b-instruct:free",
    winRatePercent: 0,
    wins: 0,
    totalVotes: 6,
    avgTtftMs: 245,
    avgTokensPerSec: 53,
  },
];

export default function LeaderboardPage() {
  const [tab, setTab] = React.useState<"global" | "personal">("global");

  const data = tab === "global" ? GLOBAL_LEADERBOARD : PERSONAL_LEADERBOARD;

  return (
    <AppShell
      breadcrumb="Leaderboard"
      threadTitle={tab === "global" ? "Global Rankings" : "Your Personal Standings"}
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header & Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Leaderboard
              </h1>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                Every model&apos;s real record, from actual head to head votes.
              </p>
            </div>

            {/* Toggle Button [Global | Personal] */}
            <div className="border-border bg-card inline-flex rounded-lg border p-1">
              <Button
                type="button"
                variant={tab === "global" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => setTab("global")}
              >
                Global
              </Button>
              <Button
                type="button"
                variant={tab === "personal" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => setTab("personal")}
              >
                Personal
              </Button>
            </div>
          </div>

          {/* Section Header */}
          <div className="border-border border-b pb-2">
            <h2 className="text-foreground text-sm font-semibold">
              {tab === "global" ? "Global Ranking" : "Personal Ranking"}
            </h2>
            <p className="text-muted-foreground text-xs">
              {tab === "global"
                ? "Every vote, every user, ranked by real wins"
                : "Your own votes and head-to-head picks in this account"}
            </p>
          </div>

          {/* Table Container */}
          <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
            {/* Table Header */}
            <div className="border-border bg-muted/40 text-muted-foreground grid grid-cols-12 items-center gap-4 border-b px-4 py-3 text-xs font-semibold">
              <div className="col-span-1">#</div>
              <div className="col-span-4 sm:col-span-5">Model</div>
              <div className="col-span-4 sm:col-span-4">Win Rate</div>
              <div className="col-span-3 text-right sm:col-span-2">Avg Metrics</div>
            </div>

            {/* Table Body */}
            <div className="divide-border/60 divide-y">
              {data.map((entry) => {
                const isFirst = entry.rank === 1;

                return (
                  <div
                    key={entry.modelId}
                    className={`grid grid-cols-12 items-center gap-4 px-4 py-3.5 text-sm transition-colors ${
                      isFirst ? "bg-primary/[0.04]" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center gap-1 font-mono font-bold">
                      {isFirst ? (
                        <span className="text-primary flex items-center gap-1">
                          <Trophy className="size-3.5 shrink-0" />
                          <span>1</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{entry.rank}</span>
                      )}
                    </div>

                    {/* Model Info */}
                    <div className="col-span-4 flex min-w-0 items-center gap-2.5 sm:col-span-5">
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                          isFirst
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {entry.letter}
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate font-medium">{entry.name}</div>
                        <div className="text-muted-foreground truncate font-mono text-[10px]">
                          {entry.fullName}
                        </div>
                      </div>
                    </div>

                    {/* Win Rate & Progress Bar */}
                    <div className="col-span-4 space-y-1 sm:col-span-4">
                      <div className="flex items-baseline justify-between">
                        <span
                          className={`font-mono text-sm font-bold sm:text-base ${
                            isFirst ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {entry.winRatePercent}%
                        </span>
                        <span className="text-muted-foreground text-[11px] font-medium">
                          won {entry.wins} of {entry.totalVotes}
                        </span>
                      </div>
                      <Progress value={entry.winRatePercent} max={100} className="h-1.5 sm:h-2" />
                    </div>

                    {/* Latency & Throughput Metrics */}
                    <div className="col-span-3 text-right font-mono text-xs sm:col-span-2">
                      <div className="text-foreground flex items-center justify-end gap-1 font-semibold">
                        <Zap className="text-muted-foreground hidden size-3 sm:inline" />
                        <span>{entry.avgTokensPerSec} tok/s</span>
                      </div>
                      <div className="text-muted-foreground flex items-center justify-end gap-1 text-[11px]">
                        <Clock className="text-muted-foreground hidden size-3 sm:inline" />
                        <span>{entry.avgTtftMs}ms</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
