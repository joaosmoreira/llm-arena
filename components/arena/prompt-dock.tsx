"use client";

import * as React from "react";
import { Send, X, Lock, LogIn } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/infrastructure/ui-kit/button";
import { Badge } from "@/infrastructure/ui-kit/badge";
import { ModelPickerPopover } from "./model-picker-popover";
import { type OpenRouterModel } from "@/infrastructure/model-catalog";

export interface SelectedModelChip {
  id: string;
  name: string;
  letter: string;
}

export interface PromptDockProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  selectedModels: SelectedModelChip[];
  onToggleModel?: (model: OpenRouterModel) => void;
  onRemoveModel?: (id: string) => void;
  availableModels?: readonly OpenRouterModel[];
  disabled?: boolean;
  isLocked?: boolean;
}

export function PromptDock({
  prompt,
  onPromptChange,
  onSubmit,
  selectedModels,
  onToggleModel,
  onRemoveModel,
  availableModels,
  disabled = false,
  isLocked = false,
}: PromptDockProps) {
  const { isSignedIn } = useUser();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isSignedIn && prompt.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const selectedModelIds = selectedModels.map((m) => m.id);

  return (
    <footer className="bg-background/80 shrink-0 p-4 pt-0 backdrop-blur-sm md:p-6">
      <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/20 mx-auto max-w-5xl rounded-xl border p-3 shadow-lg transition-all focus-within:ring-2">
        {/* Selected Model Chips Bar */}
        {selectedModels.length > 0 && (
          <div className="border-border/40 mb-2 flex flex-wrap items-center gap-1.5 border-b pb-2">
            <span className="text-muted-foreground mr-1 text-[11px] font-medium">
              Active Models:
            </span>
            {selectedModels.map((model) => (
              <Badge
                key={model.id}
                variant="secondary"
                className="border-border/60 gap-1.5 border px-2 py-0.5 font-mono text-[11px]"
              >
                <span className="text-primary font-bold">{model.letter}</span>
                <span className="text-foreground font-sans">{model.name}</span>
                {!isLocked && onRemoveModel && selectedModels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveModel(model.id)}
                    className="hover:bg-muted text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer rounded-full"
                    aria-label={`Remove ${model.name}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}

            {isLocked && (
              <span className="text-muted-foreground/80 ml-auto flex items-center gap-1 font-mono text-[10px]">
                <Lock className="size-3" /> Locked for this thread
              </span>
            )}
          </div>
        )}

        {/* Input Textarea */}
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !isSignedIn
              ? "Sign in to send a prompt and benchmark models..."
              : isLocked
                ? "Send a follow-up prompt to continue each model's conversation..."
                : "Ask anything. Enter to send, shift + enter for a new line"
          }
          disabled={disabled}
          className="text-foreground placeholder:text-muted-foreground w-full resize-none bg-transparent px-2 py-1 text-sm focus:outline-none disabled:opacity-50"
        />

        {/* Actions Bar */}
        <div className="border-border/50 flex items-center justify-between border-t pt-2.5">
          {!isLocked && onToggleModel ? (
            <ModelPickerPopover
              selectedModelIds={selectedModelIds}
              onToggleModel={onToggleModel}
              availableModels={availableModels}
              maxModels={3}
              minModels={1}
            />
          ) : (
            <div />
          )}

          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button
                type="button"
                size="sm"
                className="h-8 cursor-pointer gap-1.5 px-3.5 text-xs font-semibold shadow-md"
              >
                <span>Sign in to send</span>
                <LogIn className="size-3.5" />
              </Button>
            </SignInButton>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={disabled || !prompt.trim()}
              className="h-8 cursor-pointer gap-1.5 px-3.5 text-xs font-semibold shadow-md disabled:opacity-50"
            >
              <span>{isLocked ? "Send Follow-up" : "Send Turn"}</span>
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
