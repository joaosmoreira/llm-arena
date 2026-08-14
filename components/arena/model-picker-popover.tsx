"use client";

import * as React from "react";
import { Plus, Search, Check, Cpu, AlertCircle, Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type OpenRouterModel, FALLBACK_FREE_MODELS } from "@/lib/ai/models";

interface ModelPickerPopoverProps {
  selectedModelIds: string[];
  onToggleModel: (model: OpenRouterModel) => void;
  availableModels?: OpenRouterModel[];
  maxModels?: number;
  minModels?: number;
}

export function ModelPickerPopover({
  selectedModelIds,
  onToggleModel,
  availableModels: initialModels,
  maxModels = 3,
  minModels = 1,
}: ModelPickerPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [models, setModels] = React.useState<OpenRouterModel[]>(
    initialModels && initialModels.length > 0 ? initialModels : FALLBACK_FREE_MODELS
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchLiveModels() {
      try {
        setLoading(true);
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.models && Array.isArray(data.models) && data.models.length > 0) {
            setModels(data.models);
          }
        }
      } catch {
        // Keeps fallback models if request fails
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (open && (!initialModels || initialModels.length === 0)) {
      fetchLiveModels();
    }

    return () => {
      isMounted = false;
    };
  }, [open, initialModels]);

  const filteredModels = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return models;
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query)
    );
  }, [models, search]);

  const isAtMax = selectedModelIds.length >= maxModels;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 cursor-pointer gap-1.5 text-xs"
          aria-label="Add model to arena"
        >
          <Plus className="text-primary size-3" />
          <span>Add Model</span>
          <span className="bg-muted py-0.2 text-muted-foreground ml-1 rounded px-1.5 font-mono text-[10px]">
            {selectedModelIds.length}/{maxModels}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="border-border bg-card w-80 p-0 shadow-2xl sm:w-96"
      >
        {/* Popover Header */}
        <div className="border-border flex items-center justify-between border-b p-3">
          <div>
            <h4 className="text-foreground text-xs font-semibold">Select Benchmark Models</h4>
            <p className="text-muted-foreground text-[10px]">
              Choose 1 to {maxModels} free-tier models sorted by context window
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {selectedModelIds.length}/{maxModels} Selected
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="border-border/60 bg-muted/20 border-b p-2">
          <div className="relative flex items-center">
            <Search className="text-muted-foreground absolute left-2.5 size-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search model or provider..."
              className="border-border/80 bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-md border py-1.5 pr-3 pl-8 text-xs focus:ring-1 focus:outline-none"
            />
          </div>
        </div>

        {/* Models List */}
        <div className="divide-border/40 max-h-72 divide-y overflow-y-auto p-1.5">
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-xs">
              <Loader2 className="text-primary size-4 animate-spin" />
              <span>Loading live OpenRouter models...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-xs">
              No free-tier models found matching &quot;{search}&quot;.
            </div>
          ) : (
            filteredModels.map((model) => {
              const isSelected = selectedModelIds.includes(model.id);
              const isDisabled =
                (!isSelected && isAtMax) || (isSelected && selectedModelIds.length <= minModels);

              return (
                <button
                  key={model.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onToggleModel(model)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-md p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected ? "bg-primary/[0.08] hover:bg-primary/[0.12]" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {model.letter}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground truncate text-xs font-medium">
                          {model.name}
                        </span>
                        <span className="text-muted-foreground truncate text-[10px]">
                          ({model.provider})
                        </span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10px]">
                        <span className="flex items-center gap-0.5">
                          <Cpu className="text-primary size-2.5" />
                          {model.formattedContext}
                        </span>
                        <span>&bull;</span>
                        <span>$0.00 / free</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-1">
                    {isSelected ? (
                      <div className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full">
                        <Check className="size-3" />
                      </div>
                    ) : (
                      <div className="border-border/80 size-5 rounded-full border" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Popover Footer Notice */}
        {isAtMax && (
          <div className="border-border/80 bg-muted/40 text-muted-foreground flex items-center gap-1.5 border-t p-2 text-[10px]">
            <AlertCircle className="text-primary size-3 shrink-0" />
            <span>Maximum of {maxModels} models selected for side-by-side stream.</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
