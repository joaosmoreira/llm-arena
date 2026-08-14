"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Swords, Zap, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { PromptDock, type SelectedModelChip } from "@/components/arena/prompt-dock";
import { Card, CardHeader, CardTitle, CardContent } from "@/infrastructure/ui-kit/card";
import { Badge } from "@/infrastructure/ui-kit/badge";
import {
  type OpenRouterModel,
  FALLBACK_FREE_MODELS,
  getDefaultSelectedModels,
} from "@/infrastructure/model-catalog";

export default function ArenaHomePage() {
  const router = useRouter();

  const [availableModels, setAvailableModels] =
    React.useState<readonly OpenRouterModel[]>(FALLBACK_FREE_MODELS);
  const [selectedModels, setSelectedModels] = React.useState<readonly OpenRouterModel[]>(() =>
    getDefaultSelectedModels(FALLBACK_FREE_MODELS)
  );
  const [prompt, setPrompt] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Fetch live model catalog on mount
  React.useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          setSelectedModels(getDefaultSelectedModels(data.models));
        }
      })
      .catch(() => {
        // Keeps fallback models
      });
  }, []);

  const selectedModelChips: SelectedModelChip[] = selectedModels.map((m) => ({
    id: m.id,
    name: m.name,
    letter: m.letter,
  }));

  const modelWinRecords = selectedModels.map((m) => ({
    id: m.id,
    letter: m.letter,
    name: m.name,
    wins: 0,
    totalTurns: 0,
  }));

  const handleToggleModel = (model: OpenRouterModel) => {
    setSelectedModels((prev) => {
      const exists = prev.some((m) => m.id === model.id);
      if (exists) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m.id !== model.id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, model];
    });
  };

  const handleRemoveModel = (modelId: string) => {
    if (selectedModels.length > 1) {
      setSelectedModels((prev) => prev.filter((m) => m.id !== modelId));
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelIds: selectedModels.map((m) => m.id),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create battle thread. Please try again.");
      }

      const { threadId } = await res.json();
      router.push(`/t/${threadId}?stream=1`);
    } catch (err: unknown) {
      console.error("[Arena Submit Error]", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to initialize battle. Please try again.";
      setSubmitError(errorMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell breadcrumb="Arena" threadTitle="New Battle" modelRecords={modelWinRecords}>
      <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-6">
          {/* Hero Welcome Header */}
          <div className="mb-8 text-center">
            <div className="bg-primary/10 border-primary/20 text-primary mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border shadow-sm">
              <Swords className="size-6" />
            </div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
              3-Model Live Benchmark Arena
            </h1>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-xs leading-relaxed md:text-sm">
              Send one prompt. Watch up to three AI models answer in parallel streams with real-time
              speed and time-to-first-token metrics, then vote for the winner.
            </p>
          </div>

          {submitError && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive mx-auto mb-6 max-w-2xl rounded-lg border p-3 text-center text-xs">
              {submitError}
            </div>
          )}

          {/* Selected Models Ready Cards */}
          <div
            className={`grid grid-cols-1 gap-4 ${
              selectedModels.length === 1
                ? "mx-auto w-full max-w-md md:grid-cols-1"
                : selectedModels.length === 2
                  ? "mx-auto w-full max-w-3xl md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-3"
            }`}
          >
            {selectedModels.map((model) => (
              <Card
                key={model.id}
                className="border-border bg-card/60 hover:border-border/80 flex flex-col justify-between p-4 shadow-sm backdrop-blur-xs transition-all"
              >
                <div>
                  <CardHeader className="p-0 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="bg-muted text-foreground flex size-7 items-center justify-center rounded-full font-mono text-xs font-semibold">
                        {model.letter}
                      </div>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {model.provider}
                      </Badge>
                    </div>
                    <CardTitle className="text-foreground mt-2 truncate text-sm font-semibold">
                      {model.name}
                    </CardTitle>
                    <p className="text-muted-foreground truncate font-mono text-[10px]">
                      {model.id}
                    </p>
                  </CardHeader>

                  <CardContent className="p-0 pt-2 text-xs">
                    <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                      {model.description}
                    </p>
                  </CardContent>
                </div>

                <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-2.5 font-mono text-[10px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="text-primary size-3" /> {model.formattedContext} context
                  </span>
                  <span className="text-winner flex items-center gap-1 font-semibold">
                    <Sparkles className="size-3" /> Free Tier
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Core Feature Highlights */}
          <div className="border-border/40 bg-muted/20 text-muted-foreground mx-auto mt-8 flex flex-wrap items-center justify-center gap-6 rounded-xl border px-4 py-3 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <Zap className="text-primary size-3.5" /> Isolated Parallel Streams
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="text-primary size-3.5" /> Arcjet Protected
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="text-winner size-3.5" /> Honest Leaderboard Voting
            </span>
          </div>
        </div>
      </div>

      {/* Floating Prompt Input Dock */}
      <PromptDock
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        selectedModels={selectedModelChips}
        onToggleModel={handleToggleModel}
        onRemoveModel={handleRemoveModel}
        availableModels={availableModels}
        disabled={isSubmitting}
      />
    </AppShell>
  );
}
