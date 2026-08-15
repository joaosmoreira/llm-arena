"use client";

import * as React from "react";
import posthog from "posthog-js";
import { type OpenRouterModel } from "@/infrastructure/model-catalog";

export interface ModelStreamState {
  readonly modelId: string;
  readonly modelName: string;
  readonly letter: string;
  readonly text: string;
  readonly status: "IDLE" | "STREAMING" | "COMPLETED" | "FAILED";
  readonly ttftMs: number | null;
  readonly tokensPerSec: number | null;
  readonly totalTokens: number;
  readonly costUsd: number;
  readonly errorMessage: string | null;
  readonly responseId?: string;
}

export interface ArenaTurnData {
  readonly id: string;
  readonly prompt: string;
  readonly createdAt: string;
  readonly responses: readonly ModelStreamState[];
  readonly winnerModelId: string | null;
  readonly winnerResponseId: string | null;
}

export interface UseArenaBattleProps {
  readonly threadId?: string;
  readonly initialTurns?: readonly ArenaTurnData[];
  readonly activeModels: readonly OpenRouterModel[];
  readonly onTurnCompleted?: (turnId: string) => void;
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  // Standard token estimation: ~4 chars per token or ~1.3 tokens per word
  return Math.max(1, Math.ceil(text.length / 3.8));
}

/**
 * Maps raw provider errors to stable, safe user-facing guidance.
 * Prevents leaking internal provider diagnostics, stack traces, or upstream keys.
 */
function sanitizeErrorMessage(error: unknown): string {
  const rawMsg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred.";

  if (rawMsg.includes("free-models-per-day")) {
    return "OpenRouter daily free-tier limit reached (50 reqs/day). Please add a small credit ($5-$10) to your OpenRouter account to unlock 1,000 free requests/day, or wait for daily reset.";
  }
  if (
    rawMsg.includes("Rate limit") ||
    rawMsg.includes("429") ||
    rawMsg.includes("rate-limited") ||
    rawMsg.includes("Too Many Requests")
  ) {
    return "Model rate limit reached. Please wait a few seconds and try again.";
  }
  if (
    rawMsg.includes("401") ||
    rawMsg.includes("Unauthorized") ||
    rawMsg.includes("API key") ||
    rawMsg.includes("authentication")
  ) {
    return "AI model provider authentication issue. Please try again or switch models.";
  }
  if (
    rawMsg.includes("503") ||
    rawMsg.includes("502") ||
    rawMsg.includes("504") ||
    rawMsg.includes("unavailable") ||
    rawMsg.includes("overloaded")
  ) {
    return "The model provider is temporarily unavailable or overloaded. Please retry in a few moments.";
  }
  if (rawMsg.includes("prompt-injection") || rawMsg.includes("blocked by safety")) {
    return "This prompt was flagged by safety filters.";
  }

  return "The model failed to respond. Please try again or pick a different model.";
}

export function useArenaBattle({
  threadId,
  initialTurns = [],
  activeModels,
  onTurnCompleted,
}: UseArenaBattleProps) {
  const [currentThreadId, setCurrentThreadId] = React.useState<string | undefined>(threadId);
  const [turns, setTurns] = React.useState<readonly ArenaTurnData[]>(initialTurns);

  // Sync state if navigating to a different thread
  if (threadId !== currentThreadId) {
    setCurrentThreadId(threadId);
    setTurns(initialTurns);
  }

  const [activeTurnId, setActiveTurnId] = React.useState<string | null>(null);
  const [activeStreams, setActiveStreams] = React.useState<
    Readonly<Record<string, ModelStreamState>>
  >({});
  const [isVoting, setIsVoting] = React.useState<boolean>(false);
  const abortControllersRef = React.useRef<Map<string, AbortController>>(new Map());

  // Keep a ref to turns so streamTurn/retryModel can read current turns
  // without needing turns in their useCallback dependency arrays.
  // This prevents streamTurn from being recreated on every state update,
  // which was causing stale closures and re-triggering effects.
  const turnsRef = React.useRef<readonly ArenaTurnData[]>(turns);
  const onTurnCompletedRef = React.useRef(onTurnCompleted);
  React.useEffect(() => {
    turnsRef.current = turns;
    onTurnCompletedRef.current = onTurnCompleted;
  });

  // Clean up abort controllers on unmount
  React.useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  const isStreaming = React.useMemo(() => {
    return Object.values(activeStreams).some((s) => s.status === "STREAMING");
  }, [activeStreams]);

  /**
   * Start streaming all active models for a turn
   */
  const streamTurn = React.useCallback(
    async (turnId: string, promptText: string) => {
      console.log("[useArenaBattle] streamTurn invoked:", {
        turnId,
        promptText,
        threadId,
        activeModelsCount: activeModels.length,
        activeModels: activeModels.map((m) => m.id),
      });

      setActiveTurnId(turnId);

      // Build model history map from previous completed turns
      const historyByModel: Record<string, { role: "user" | "assistant"; content: string }[]> = {};

      activeModels.forEach((model) => {
        const history: { role: "user" | "assistant"; content: string }[] = [];
        turnsRef.current.forEach((t) => {
          if (t.id !== turnId) {
            history.push({ role: "user", content: t.prompt });
            const prevRes = t.responses.find((r) => r.modelId === model.id);
            if (prevRes && prevRes.text) {
              history.push({ role: "assistant", content: prevRes.text });
            }
          }
        });
        history.push({ role: "user", content: promptText });
        historyByModel[model.id] = history;
      });

      // Initialize stream state for each active model
      const initialStreamStates: Record<string, ModelStreamState> = {};
      activeModels.forEach((model) => {
        initialStreamStates[model.id] = {
          modelId: model.id,
          modelName: model.name,
          letter: model.letter,
          text: "",
          status: "STREAMING",
          ttftMs: null,
          tokensPerSec: null,
          totalTokens: 0,
          costUsd: 0,
          errorMessage: null,
        };
      });
      setActiveStreams(initialStreamStates);

      // PostHog funnel event: prompt sent
      posthog.capture("prompt_sent", {
        threadId,
        turnId,
        modelCount: activeModels.length,
        modelIds: activeModels.map((m) => m.id),
      });

      // Launch independent parallel stream for each model
      const streamPromises = activeModels.map(async (model) => {
        const startTime = performance.now();
        let firstTokenTime: number | null = null;
        let accumulatedText = "";

        const controller = new AbortController();
        abortControllersRef.current.set(model.id, controller);

        try {
          console.log(`[useArenaBattle] Fetching /api/chat for ${model.id}...`);
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modelId: model.id,
              messages: historyByModel[model.id],
              threadId,
            }),
            signal: controller.signal,
          });

          console.log(
            `[useArenaBattle] /api/chat responded for ${model.id} with status: ${res.status}`
          );

          if (!res.ok) {
            const errorPayload = await res.json().catch(() => null);
            const message =
              errorPayload?.error ||
              (res.status === 429
                ? "Rate limit exceeded. Please wait a few seconds and retry."
                : res.status === 401
                  ? "Please sign in to send prompts."
                  : "The model failed to respond. Please retry.");
            console.error(`[useArenaBattle] /api/chat error for ${model.id}:`, message);
            throw new Error(message);
          }

          if (!res.body) {
            throw new Error("No response body received from model stream.");
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          let sseBuffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data) as {
                  choices?: {
                    delta?: { content?: string; reasoning?: string };
                    finish_reason?: string;
                  }[];
                  error?: { message?: string };
                };

                if (parsed.error?.message) {
                  throw new Error(sanitizeErrorMessage(parsed.error.message));
                }

                const content = parsed.choices?.[0]?.delta?.content ?? "";
                const reasoning = parsed.choices?.[0]?.delta?.reasoning ?? "";
                const token = content || reasoning;

                if (token) {
                  accumulatedText += token;
                }
              } catch (parseErr) {
                if (
                  parseErr instanceof Error &&
                  parseErr.message !== "Unexpected end of JSON input"
                ) {
                  throw parseErr; // real error, bubble up
                }
                // malformed SSE line — skip
              }
            }

            console.log(
              `[useArenaBattle] SSE parsed for ${model.id}: accumulated ${accumulatedText.length} chars`
            );

            if (firstTokenTime === null && accumulatedText.trim().length > 0) {
              firstTokenTime = Math.round(performance.now() - startTime);
            }

            // Check for upstream error sentinel injected by the server
            const sentinelIdx = accumulatedText.indexOf("\n__STREAM_ERROR__:");
            if (sentinelIdx !== -1) {
              const errorMsg = accumulatedText
                .slice(sentinelIdx + "\n__STREAM_ERROR__:".length)
                .trim();
              accumulatedText = accumulatedText.slice(0, sentinelIdx);
              throw new Error(errorMsg || "Model stream encountered an error.");
            }

            const currentTokens = estimateTokens(accumulatedText);
            const elapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
            const speed = Math.round((currentTokens / elapsedSec) * 10) / 10;

            setActiveStreams((prev) => ({
              ...prev,
              [model.id]: {
                ...prev[model.id],
                text: accumulatedText,
                status: "STREAMING",
                ttftMs: firstTokenTime,
                tokensPerSec: speed,
                totalTokens: currentTokens,
              },
            }));
          }

          // Also check the full buffer after stream close (sentinel may arrive in last chunk)
          const sentinelIdx = accumulatedText.indexOf("\n__STREAM_ERROR__:");
          if (sentinelIdx !== -1) {
            const errorMsg = accumulatedText
              .slice(sentinelIdx + "\n__STREAM_ERROR__:".length)
              .trim();
            accumulatedText = accumulatedText.slice(0, sentinelIdx);
            throw new Error(errorMsg || "Model stream encountered an error.");
          }

          if (accumulatedText.trim().length === 0) {
            throw new Error("No response was returned by the model provider. Please try again.");
          }

          const finishTime = performance.now();
          const totalTokens = estimateTokens(accumulatedText);
          const elapsedSec = Math.max(0.1, (finishTime - startTime) / 1000);
          const finalSpeed = Math.round((totalTokens / elapsedSec) * 10) / 10;
          const finalTtft = firstTokenTime ?? Math.round(finishTime - startTime);

          // Save completed response to database
          const saveRes = await fetch("/api/responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              turnId,
              modelId: model.id,
              modelName: model.name,
              text: accumulatedText,
              status: "COMPLETED",
              timeToFirstTokenMs: finalTtft,
              tokensPerSecond: finalSpeed,
              inputTokens: estimateTokens(promptText),
              outputTokens: totalTokens,
              totalTokens,
              costUsd: 0,
            }),
          }).catch(() => null);

          const savedData = saveRes?.ok ? await saveRes.json().catch(() => null) : null;
          const responseId = savedData?.response?.id;

          setActiveStreams((prev) => ({
            ...prev,
            [model.id]: {
              ...prev[model.id],
              text: accumulatedText,
              status: "COMPLETED",
              ttftMs: finalTtft,
              tokensPerSec: finalSpeed,
              totalTokens,
              responseId,
            },
          }));

          setTurns((prevTurns) =>
            prevTurns.map((t) => {
              if (t.id !== turnId) return t;
              return {
                ...t,
                responses: t.responses.map((r) => {
                  if (r.modelId !== model.id) return r;
                  return {
                    ...r,
                    text: accumulatedText,
                    status: "COMPLETED",
                    ttftMs: finalTtft,
                    tokensPerSec: finalSpeed,
                    totalTokens,
                    responseId,
                    errorMessage: null,
                  };
                }),
              };
            })
          );

          // PostHog funnel event: model stream completed
          posthog.capture("model_stream_completed", {
            threadId,
            turnId,
            modelId: model.id,
            modelName: model.name,
            ttftMs: finalTtft,
            tokensPerSec: finalSpeed,
            totalTokens,
          });
        } catch (error: unknown) {
          if (controller.signal.aborted) return;

          const errorMsg = sanitizeErrorMessage(error);

          // Persist failed response state to DB
          await fetch("/api/responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              turnId,
              modelId: model.id,
              modelName: model.name,
              text: accumulatedText || "",
              status: "FAILED",
              errorMessage: errorMsg,
            }),
          }).catch(() => null);

          setActiveStreams((prev) => ({
            ...prev,
            [model.id]: {
              ...prev[model.id],
              status: "FAILED",
              errorMessage: errorMsg,
            },
          }));

          setTurns((prevTurns) =>
            prevTurns.map((t) => {
              if (t.id !== turnId) return t;
              return {
                ...t,
                responses: t.responses.map((r) => {
                  if (r.modelId !== model.id) return r;
                  return {
                    ...r,
                    text: accumulatedText || "",
                    status: "FAILED",
                    errorMessage: errorMsg,
                  };
                }),
              };
            })
          );

          // PostHog funnel event: model stream failed
          posthog.capture("model_stream_failed", {
            threadId,
            turnId,
            modelId: model.id,
            modelName: model.name,
            error: errorMsg,
          });
        } finally {
          abortControllersRef.current.delete(model.id);
        }
      });

      await Promise.allSettled(streamPromises);
      onTurnCompletedRef.current?.(turnId);
    },
    [activeModels, threadId]
  );

  /**
   * Retry an individual failed model in a turn
   */
  const retryModel = React.useCallback(
    async (turnId: string, modelId: string, promptText: string) => {
      const model = activeModels.find((m) => m.id === modelId);
      if (!model) return;

      setActiveStreams((prev) => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          status: "STREAMING",
          errorMessage: null,
          text: "",
        },
      }));

      const startTime = performance.now();
      let firstTokenTime: number | null = null;
      let accumulatedText = "";

      const controller = new AbortController();
      abortControllersRef.current.set(modelId, controller);

      try {
        const history: { role: "user" | "assistant"; content: string }[] = [];
        turnsRef.current.forEach((t) => {
          if (t.id !== turnId) {
            history.push({ role: "user", content: t.prompt });
            const prevRes = t.responses.find((r) => r.modelId === modelId);
            if (prevRes && prevRes.text) {
              history.push({ role: "assistant", content: prevRes.text });
            }
          }
        });
        history.push({ role: "user", content: promptText });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId,
            messages: history,
            threadId,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Retry failed. Model is currently unreachable.");
        }

        if (!res.body) throw new Error("No response body received.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as {
                choices?: {
                  delta?: { content?: string; reasoning?: string };
                  finish_reason?: string;
                }[];
                error?: { message?: string };
              };

              if (parsed.error?.message) {
                throw new Error(sanitizeErrorMessage(parsed.error.message));
              }

              const content = parsed.choices?.[0]?.delta?.content ?? "";
              const reasoning = parsed.choices?.[0]?.delta?.reasoning ?? "";
              const token = content || reasoning;

              if (token) {
                accumulatedText += token;
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== "Unexpected end of JSON input"
              ) {
                throw parseErr;
              }
            }
          }

          if (firstTokenTime === null && accumulatedText.trim().length > 0) {
            firstTokenTime = Math.round(performance.now() - startTime);
          }

          const currentTokens = estimateTokens(accumulatedText);
          const elapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
          const speed = Math.round((currentTokens / elapsedSec) * 10) / 10;

          setActiveStreams((prev) => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              text: accumulatedText,
              status: "STREAMING",
              ttftMs: firstTokenTime,
              tokensPerSec: speed,
              totalTokens: currentTokens,
            },
          }));
        }

        if (accumulatedText.trim().length === 0) {
          throw new Error("No response was returned by the model provider. Please try again.");
        }

        const finishTime = performance.now();
        const totalTokens = estimateTokens(accumulatedText);
        const elapsedSec = Math.max(0.1, (finishTime - startTime) / 1000);
        const finalSpeed = Math.round((totalTokens / elapsedSec) * 10) / 10;
        const finalTtft = firstTokenTime ?? Math.round(finishTime - startTime);

        const saveRes = await fetch("/api/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turnId,
            modelId: model.id,
            modelName: model.name,
            text: accumulatedText,
            status: "COMPLETED",
            timeToFirstTokenMs: finalTtft,
            tokensPerSecond: finalSpeed,
            totalTokens,
            costUsd: 0,
          }),
        }).catch(() => null);

        const savedData = saveRes?.ok ? await saveRes.json().catch(() => null) : null;
        const responseId = savedData?.response?.id;

        setActiveStreams((prev) => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            text: accumulatedText,
            status: "COMPLETED",
            ttftMs: finalTtft,
            tokensPerSec: finalSpeed,
            totalTokens,
            responseId,
          },
        }));

        setTurns((prevTurns) =>
          prevTurns.map((t) => {
            if (t.id !== turnId) return t;
            return {
              ...t,
              responses: t.responses.map((r) => {
                if (r.modelId !== modelId) return r;
                return {
                  ...r,
                  text: accumulatedText,
                  status: "COMPLETED",
                  ttftMs: finalTtft,
                  tokensPerSec: finalSpeed,
                  totalTokens,
                  responseId,
                  errorMessage: null,
                };
              }),
            };
          })
        );
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        const errorMsg = sanitizeErrorMessage(error);

        // Persist failed retry response state to DB
        await fetch("/api/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turnId,
            modelId: model.id,
            modelName: model.name,
            text: accumulatedText || "",
            status: "FAILED",
            errorMessage: errorMsg,
          }),
        }).catch(() => null);

        setActiveStreams((prev) => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            status: "FAILED",
            errorMessage: errorMsg,
          },
        }));

        setTurns((prevTurns) =>
          prevTurns.map((t) => {
            if (t.id !== turnId) return t;
            return {
              ...t,
              responses: t.responses.map((r) => {
                if (r.modelId !== modelId) return r;
                return {
                  ...r,
                  text: accumulatedText || "",
                  status: "FAILED",
                  errorMessage: errorMsg,
                };
              }),
            };
          })
        );
      } finally {
        abortControllersRef.current.delete(modelId);
      }
    },
    [activeModels, threadId]
  );

  /**
   * Cast a vote for a winning model response
   */
  const castVote = React.useCallback(
    async (turnId: string, modelId: string, modelResponseId: string) => {
      if (isVoting) return;
      setIsVoting(true);

      // Optimistically update turns state
      setTurns((prev) =>
        prev.map((t) => {
          if (t.id === turnId) {
            return {
              ...t,
              winnerModelId: modelId,
              winnerResponseId: modelResponseId,
            };
          }
          return t;
        })
      );

      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turnId,
            modelResponseId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Failed to record vote.");
        }

        posthog.capture("vote_cast", {
          threadId,
          turnId,
          modelId,
          modelResponseId,
        });
      } catch (error: unknown) {
        console.error("[Cast Vote Client Error]", error);
        // Note: keeping optimistic vote visible or display toast if needed
      } finally {
        setIsVoting(false);
      }
    },
    [isVoting, threadId]
  );

  return {
    turns,
    setTurns,
    activeTurnId,
    activeStreams,
    isStreaming,
    isVoting,
    streamTurn,
    retryModel,
    castVote,
  };
}
