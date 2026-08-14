"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { ResponseCard } from "@/components/arena/response-card";
import { PromptDock, type SelectedModelChip } from "@/components/arena/prompt-dock";
import { type OpenRouterModel } from "@/lib/ai/models";

interface ModelTurnData {
  id: string;
  name: string;
  letter: string;
  fullName: string;
  response: string;
  ttftMs: number;
  tokensPerSec: number;
  totalTokens: number;
  wins: number;
  totalTurns: number;
}

const INITIAL_MODELS: ModelTurnData[] = [
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5",
    letter: "N",
    fullName: "nvidia/nemotron-3.5-lightning:free",
    wins: 2,
    totalTurns: 3,
    ttftMs: 184,
    tokensPerSec: 64,
    totalTokens: 342,
    response:
      "Quantum superposition allows a subatomic particle to exist simultaneously in multiple potential states or locations until a measurement occurs. When observed, this cloud of probabilities instantly collapses into one definite outcome. This fundamental principle forms the computational engine behind quantum computers solving massive parallel problems.",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    name: "Qwen 2.5 72B",
    letter: "Q",
    fullName: "qwen/qwen-2.5-72b-instruct:free",
    wins: 1,
    totalTurns: 3,
    ttftMs: 312,
    tokensPerSec: 48,
    totalTokens: 289,
    response:
      "In quantum physics, superposition means that a physical system can exist in a linear combination of several distinct states at once. Only when an interaction or observation happens does the system commit to a single observable reality. It is akin to a spinning coin that represents both heads and tails until it stops on the table.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    letter: "L",
    fullName: "meta-llama/llama-3.3-70b-instruct:free",
    wins: 0,
    totalTurns: 3,
    ttftMs: 245,
    tokensPerSec: 53,
    totalTokens: 310,
    response:
      "Superposition describes how quantum particles hold multiple possible states concurrently rather than picking one beforehand. The act of measuring forces the particle to choose a single definite state according to probability. This unique trait enables quantum computers to evaluate vast numbers of paths simultaneously.",
  },
];

export default function ArenaHomePage() {
  const [selectedWinner, setSelectedWinner] = React.useState<string | null>(
    "nvidia/nemotron-3.5-lightning:free"
  );
  const [prompt, setPrompt] = React.useState(
    "Explain the concept of quantum superposition in three simple sentences."
  );
  const [models, setModels] = React.useState<ModelTurnData[]>(INITIAL_MODELS);

  const selectedModelChips: SelectedModelChip[] = models.map((m) => ({
    id: m.id,
    name: m.name,
    letter: m.letter,
  }));

  const modelWinRecords = models.map((m) => ({
    id: m.id,
    letter: m.letter,
    name: m.name,
    wins: m.wins,
    totalTurns: m.totalTurns,
    isCurrentWinner: selectedWinner === m.id,
  }));

  const handleVote = (modelId: string) => {
    setSelectedWinner((prev) => (prev === modelId ? null : modelId));
  };

  const handleRemoveModel = (modelId: string) => {
    if (models.length > 1) {
      setModels((prev) => prev.filter((m) => m.id !== modelId));
    }
  };

  const handleToggleModel = (model: OpenRouterModel) => {
    setModels((prev) => {
      const exists = prev.some((m) => m.id === model.id);
      if (exists) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m.id !== model.id);
      }
      if (prev.length >= 3) return prev;
      return [
        ...prev,
        {
          id: model.id,
          name: model.name,
          letter: model.letter,
          fullName: model.id,
          response: `Streaming response for ${model.name} will be connected in Feature 6. This model supports ${model.formattedContext} context window.`,
          ttftMs: 200,
          tokensPerSec: 50,
          totalTokens: 250,
          wins: 0,
          totalTurns: 0,
        },
      ];
    });
  };

  const handleSubmit = () => {
    void prompt;
  };

  return (
    <AppShell
      breadcrumb="Arena"
      threadTitle="Quantum physics superposition intro"
      modelRecords={modelWinRecords}
    >
      {/* Scrollable Conversation History */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          {/* User Prompt Message Bubble */}
          <div className="flex justify-end">
            <div className="bg-muted/80 border-border/50 text-foreground max-w-2xl rounded-2xl rounded-tr-sm border px-5 py-3.5 text-sm shadow-sm">
              <p className="leading-relaxed font-normal">{prompt}</p>
            </div>
          </div>

          {/* Model Answer Cards in Responsive Columns (1 to 3 models) */}
          <div
            className={`grid grid-cols-1 gap-4 ${
              models.length === 1
                ? "mx-auto w-full max-w-2xl md:grid-cols-1"
                : models.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-3"
            }`}
          >
            {models.map((model) => (
              <ResponseCard
                key={model.id}
                id={model.id}
                name={model.name}
                letter={model.letter}
                fullName={model.fullName}
                response={model.response}
                ttftMs={model.ttftMs}
                tokensPerSec={model.tokensPerSec}
                totalTokens={model.totalTokens}
                costUsd={0}
                isWinner={selectedWinner === model.id}
                onVote={handleVote}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Prompt Input Dock with Live Model Picker Popover */}
      <PromptDock
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        selectedModels={selectedModelChips}
        onToggleModel={handleToggleModel}
        onRemoveModel={handleRemoveModel}
      />
    </AppShell>
  );
}
