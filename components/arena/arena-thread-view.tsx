"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { ResponseCard } from "@/components/arena/response-card";
import { PromptDock, type SelectedModelChip } from "@/components/arena/prompt-dock";
import { useArenaBattle, type ArenaTurnData } from "@/lib/arena/use-arena-battle";
import { type OpenRouterModel } from "@/infrastructure/model-catalog";

interface ArenaThreadViewProps {
  readonly thread: {
    readonly id: string;
    readonly title: string;
    readonly turns: readonly {
      readonly id: string;
      readonly prompt: string;
      readonly createdAt: string;
      readonly responses: readonly {
        readonly id: string;
        readonly modelId: string;
        readonly modelName: string;
        readonly text: string;
        readonly status: "STREAMING" | "COMPLETED" | "FAILED";
        readonly timeToFirstTokenMs: number | null;
        readonly tokensPerSecond: number | null;
        readonly totalTokens: number | null;
        readonly costUsd: number | null;
        readonly errorMessage: string | null;
      }[];
      readonly vote: {
        readonly id: string;
        readonly modelResponseId: string;
        readonly modelResponse: {
          readonly modelId: string;
        };
      } | null;
    }[];
  };
  readonly threadModels: readonly OpenRouterModel[];
}

export function ArenaThreadView({ thread, threadModels }: ArenaThreadViewProps) {
  const searchParams = useSearchParams();
  const autoStream = searchParams.get("stream") === "1";

  // Transform initial DB turns to ArenaTurnData
  const initialTurns: readonly ArenaTurnData[] = React.useMemo(() => {
    return thread.turns.map((t) => ({
      id: t.id,
      prompt: t.prompt,
      createdAt: t.createdAt,
      winnerModelId: t.vote?.modelResponse?.modelId ?? null,
      winnerResponseId: t.vote?.modelResponseId ?? null,
      responses: threadModels.map((model) => {
        const res = t.responses.find((r) => r.modelId === model.id);
        return {
          modelId: model.id,
          modelName: model.name,
          letter: model.letter,
          text: res?.text ?? "",
          status: (res?.status as "STREAMING" | "COMPLETED" | "FAILED") ?? "IDLE",
          ttftMs: res?.timeToFirstTokenMs ?? null,
          tokensPerSec: res?.tokensPerSecond ?? null,
          totalTokens: res?.totalTokens ?? 0,
          costUsd: res?.costUsd ?? 0,
          errorMessage: res?.errorMessage ?? null,
          responseId: res?.id,
        };
      }),
    }));
  }, [thread, threadModels]);

  const [followupPrompt, setFollowupPrompt] = React.useState("");

  const {
    turns,
    setTurns,
    activeTurnId,
    activeStreams,
    isStreaming,
    streamTurn,
    retryModel,
    castVote,
  } = useArenaBattle({
    threadId: thread.id,
    initialTurns,
    activeModels: threadModels,
  });

  // Automatically trigger streaming for the latest turn if pending
  const hasAutoStreamedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasAutoStreamedRef.current && turns.length > 0) {
      const latestTurn = turns[turns.length - 1];
      const hasCompleted = latestTurn.responses.some((r) => r.status === "COMPLETED");
      const isPending =
        autoStream || latestTurn.responses.some((r) => r.status === "STREAMING" && !r.text);

      console.log("[ArenaThreadView] autoStream effect evaluated:", {
        autoStream,
        isPending,
        hasCompleted,
        hasAutoStreamed: hasAutoStreamedRef.current,
        latestTurnId: latestTurn.id,
      });

      if (isPending && !hasCompleted) {
        hasAutoStreamedRef.current = true;
        console.log("[ArenaThreadView] Triggering streamTurn for turn:", latestTurn.id);
        void streamTurn(latestTurn.id, latestTurn.prompt);
      }
    }
  }, [autoStream, turns, streamTurn]);

  // Model chips for prompt dock
  const selectedModelChips: SelectedModelChip[] = threadModels.map((m) => ({
    id: m.id,
    name: m.name,
    letter: m.letter,
  }));

  // Calculate model win records for header
  const modelWinRecords = threadModels.map((m) => {
    const wins = turns.filter((t) => t.winnerModelId === m.id).length;
    const totalCompletedTurns = turns.filter((t) =>
      t.responses.some((r) => r.modelId === m.id && r.status === "COMPLETED")
    ).length;

    const latestTurn = turns[turns.length - 1];
    const isCurrentWinner = latestTurn?.winnerModelId === m.id;

    return {
      id: m.id,
      letter: m.letter,
      name: m.name,
      wins,
      totalTurns: totalCompletedTurns,
      isCurrentWinner,
    };
  });

  const handleSendFollowup = async () => {
    if (!followupPrompt.trim() || isStreaming) return;
    const promptText = followupPrompt.trim();
    setFollowupPrompt("");

    try {
      const res = await fetch("/api/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: thread.id,
          prompt: promptText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create follow-up turn.");
      }

      const { turnId } = await res.json();

      // Append new turn locally
      const newTurn: ArenaTurnData = {
        id: turnId,
        prompt: promptText,
        createdAt: new Date().toISOString(),
        winnerModelId: null,
        winnerResponseId: null,
        responses: threadModels.map((m) => ({
          modelId: m.id,
          modelName: m.name,
          letter: m.letter,
          text: "",
          status: "STREAMING",
          ttftMs: null,
          tokensPerSec: null,
          totalTokens: 0,
          costUsd: 0,
          errorMessage: null,
        })),
      };

      setTurns((prev) => [...prev, newTurn]);

      // Stream the new turn
      await streamTurn(turnId, promptText);
    } catch (err) {
      console.error("[Follow-up Error]", err);
    }
  };

  return (
    <AppShell breadcrumb="Arena" threadTitle={thread.title} modelRecords={modelWinRecords}>
      {/* Scrollable Conversation History */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          {turns.map((turn, turnIdx) => {
            const isTurnActive = turn.id === activeTurnId;
            const completedCount = turn.responses.filter((r) => {
              const stream = isTurnActive ? activeStreams[r.modelId] : null;
              const effectiveStatus = stream ? stream.status : r.status;
              return effectiveStatus === "COMPLETED";
            }).length;

            const canVoteOnTurn = completedCount >= 2;

            return (
              <div
                key={turn.id}
                className="border-border/40 flex flex-col gap-5 border-b pb-8 last:border-b-0"
              >
                {/* User Prompt Message Bubble */}
                <div className="flex justify-end">
                  <div className="bg-muted/80 border-border/60 text-foreground max-w-2xl rounded-2xl rounded-tr-sm border px-5 py-3.5 text-sm shadow-sm">
                    <div className="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-wider uppercase">
                      Turn {turnIdx + 1}
                    </div>
                    <p className="leading-relaxed font-normal whitespace-pre-wrap">{turn.prompt}</p>
                  </div>
                </div>

                {/* Model Answer Cards in Responsive Grid */}
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    threadModels.length === 1
                      ? "mx-auto w-full max-w-2xl md:grid-cols-1"
                      : threadModels.length === 2
                        ? "md:grid-cols-2"
                        : "md:grid-cols-3"
                  }`}
                >
                  {threadModels.map((model) => {
                    const activeStream = isTurnActive ? activeStreams[model.id] : null;
                    const savedResponse = turn.responses.find((r) => r.modelId === model.id);

                    const text = activeStream?.text || savedResponse?.text || "";
                    const status = activeStream?.status || savedResponse?.status || "IDLE";
                    const ttftMs = activeStream?.ttftMs ?? savedResponse?.ttftMs ?? null;
                    const tokensPerSec =
                      activeStream?.tokensPerSec ?? savedResponse?.tokensPerSec ?? null;
                    const totalTokens =
                      activeStream?.totalTokens || savedResponse?.totalTokens || 0;
                    const errorMessage =
                      activeStream?.errorMessage || savedResponse?.errorMessage || null;
                    const isWinner = turn.winnerModelId === model.id;

                    const responseId = activeStream?.responseId ?? savedResponse?.responseId;

                    return (
                      <ResponseCard
                        key={`${turn.id}-${model.id}`}
                        id={model.id}
                        name={model.name}
                        letter={model.letter}
                        fullName={model.id}
                        response={text}
                        status={status}
                        ttftMs={ttftMs}
                        tokensPerSec={tokensPerSec}
                        totalTokens={totalTokens}
                        costUsd={0}
                        errorMessage={errorMessage}
                        isWinner={isWinner}
                        canVote={
                          canVoteOnTurn && !isStreaming && !turn.winnerModelId && !!responseId
                        }
                        onVote={() => {
                          if (responseId) {
                            void castVote(turn.id, model.id, responseId);
                          }
                        }}
                        onRetry={() => {
                          void retryModel(turn.id, model.id, turn.prompt);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Prompt Input Dock (Models Locked inside Thread) */}
      <PromptDock
        prompt={followupPrompt}
        onPromptChange={setFollowupPrompt}
        onSubmit={handleSendFollowup}
        selectedModels={selectedModelChips}
        disabled={isStreaming}
        isLocked={true}
      />
    </AppShell>
  );
}
