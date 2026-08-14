"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { ResponseCard } from "@/components/arena/response-card";
import { PromptDock, type SelectedModelChip } from "@/components/arena/prompt-dock";
import { type OpenRouterModel } from "@/lib/ai/models";

interface ThreadModel {
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

interface ThreadData {
  id: string;
  title: string;
  prompt: string;
  models: ThreadModel[];
  winnerId: string | null;
}

const THREAD_DATABASE: Record<string, ThreadData> = {
  "thread-1": {
    id: "thread-1",
    title: "Quantum physics superposition intro",
    prompt: "Explain the concept of quantum superposition in three simple sentences.",
    winnerId: "nvidia/nemotron-3.5-lightning:free",
    models: [
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
    ],
  },
  "thread-2": {
    id: "thread-2",
    title: "Rust vs Go memory concurrency",
    prompt: "Compare Rust ownership model vs Go goroutines and channels for concurrent workloads.",
    winnerId: "qwen/qwen-2.5-72b-instruct:free",
    models: [
      {
        id: "qwen/qwen-2.5-72b-instruct:free",
        name: "Qwen 2.5 72B",
        letter: "Q",
        fullName: "qwen/qwen-2.5-72b-instruct:free",
        wins: 2,
        totalTurns: 2,
        ttftMs: 290,
        tokensPerSec: 52,
        totalTokens: 360,
        response:
          "Rust eliminates data races at compile time through its strict ownership, borrowing, and Send/Sync traits, requiring zero runtime garbage collection. In contrast, Go embraces runtime simplicity with lightweight goroutines and CSP-style channels backed by a concurrent garbage collector. While Rust maximizes predictable latency and memory safety, Go prioritizes developer velocity and straightforward server concurrency.",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "Llama 3.3 70B",
        letter: "L",
        fullName: "meta-llama/llama-3.3-70b-instruct:free",
        wins: 0,
        totalTurns: 2,
        ttftMs: 230,
        tokensPerSec: 55,
        totalTokens: 340,
        response:
          "Rust enforces fearless concurrency at compile time without a garbage collector, ensuring references are thread-safe before compilation finishes. Go utilizes green threads (goroutines) communicating over channels under runtime coordination. Rust delivers maximum performance and zero race conditions, whereas Go offers rapid development with a small runtime overhead.",
      },
    ],
  },
  "thread-3": {
    id: "thread-3",
    title: "PostgreSQL indexing & B-tree query plan",
    prompt: "How does a B-tree index optimize range queries and sorting in PostgreSQL?",
    winnerId: "nvidia/nemotron-3.5-lightning:free",
    models: [
      {
        id: "nvidia/nemotron-3.5-lightning:free",
        name: "Nemotron 3.5",
        letter: "N",
        fullName: "nvidia/nemotron-3.5-lightning:free",
        wins: 1,
        totalTurns: 1,
        ttftMs: 175,
        tokensPerSec: 68,
        totalTokens: 315,
        response:
          "PostgreSQL B-tree indexes maintain a balanced, sorted tree where leaf pages are linked sequentially in a doubly-linked list. For range queries (e.g. `BETWEEN` or `>=`), the planner navigates log(N) tree levels to locate the first matching leaf, then traverses neighbor pages sequentially without re-traversing tree nodes. Because keys are already ordered, queries with `ORDER BY` can skip the sorting phase entirely using an index scan.",
      },
      {
        id: "mistralai/mistral-nemo:free",
        name: "Mistral Nemo",
        letter: "M",
        fullName: "mistralai/mistral-nemo:free",
        wins: 0,
        totalTurns: 1,
        ttftMs: 210,
        tokensPerSec: 60,
        totalTokens: 290,
        response:
          "B-trees keep data in sorted order across balanced leaf nodes. A range scan finds the lower bound in O(log N) operations and follows page pointers forward until the upper bound is reached. This avoids full table scans and allows PostgreSQL to satisfy sorted outputs directly from the index order.",
      },
    ],
  },
};

function ThreadView({ thread }: { thread: ThreadData }) {
  const [selectedWinner, setSelectedWinner] = React.useState<string | null>(thread.winnerId);
  const [prompt, setPrompt] = React.useState(thread.prompt);
  const [models, setModels] = React.useState<ThreadModel[]>(thread.models);

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
          response: `Model ${model.name} added to comparison turn. Streaming will connect in Feature 6.`,
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
    <AppShell breadcrumb="Arena" threadTitle={thread.title} modelRecords={modelWinRecords}>
      {/* Scrollable Conversation History */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          {/* User Prompt Bubble */}
          <div className="flex justify-end">
            <div className="bg-muted/80 border-border/50 text-foreground max-w-2xl rounded-2xl rounded-tr-sm border px-5 py-3.5 text-sm shadow-sm">
              <p className="leading-relaxed font-normal">{prompt}</p>
            </div>
          </div>

          {/* Model Answer Cards (Responsive 1-3 Columns) */}
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

export default function ThreadPage() {
  const params = useParams();
  const threadId = typeof params?.id === "string" ? params.id : "thread-1";
  const thread = THREAD_DATABASE[threadId] ?? THREAD_DATABASE["thread-1"];

  return <ThreadView key={thread.id} thread={thread} />;
}
