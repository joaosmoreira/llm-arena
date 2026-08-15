"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/infrastructure/ui-kit/button";
import { Badge } from "@/infrastructure/ui-kit/badge";

export interface ModelWinRecord {
  id: string;
  letter: string;
  name: string;
  wins: number;
  totalTurns: number;
  isCurrentWinner?: boolean;
}

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  breadcrumb?: string;
  threadTitle?: string;
  modelRecords?: ModelWinRecord[];
}

export function AppHeader({
  sidebarOpen,
  onToggleSidebar,
  breadcrumb = "Arena",
  threadTitle = "New Battle",
  modelRecords = [],
}: AppHeaderProps) {
  return (
    <header className="border-border bg-card/75 sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b px-3 backdrop-blur-md transition-colors sm:px-5">
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer transition-colors"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
        </Button>

        <div className="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2">
          <span className="text-muted-foreground shrink-0 font-medium">{breadcrumb}</span>
          <span className="text-muted-foreground/50 shrink-0">/</span>
          <span className="text-foreground truncate font-semibold">{threadTitle}</span>
        </div>
      </div>

      {/* Right: Model Win Pills for Current Thread (Shrinks to dot + number when crowded) */}
      {modelRecords.length > 0 && (
        <div
          className="flex shrink-0 items-center gap-1.5 pl-2"
          role="region"
          aria-label="Model win records"
        >
          {modelRecords.map((model) => {
            const hasWins = model.wins > 0;
            const isWinner = !!model.isCurrentWinner;

            return (
              <Badge
                key={model.id}
                variant="secondary"
                title={`${model.name}: won ${model.wins} of ${model.totalTurns} turn${
                  model.totalTurns === 1 ? "" : "s"
                }`}
                className={`flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[11px] transition-all sm:gap-1.5 sm:px-2 ${
                  isWinner
                    ? "border-winner/40 bg-winner/10 text-winner font-semibold shadow-xs"
                    : hasWins
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border/60 text-muted-foreground"
                }`}
              >
                {/* Visual Indicator: Dot or Letter */}
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isWinner
                      ? "bg-winner text-winner-foreground"
                      : hasWins
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {model.letter}
                </span>

                {/* Model Name (hidden on compact screens to prevent header crowding) */}
                <span className="hidden max-w-[90px] truncate md:inline lg:max-w-[120px]">
                  {model.name}
                </span>

                {/* Win Count: "wins/total" on desktop, just "wins" on mobile */}
                <span
                  className={`font-semibold ${
                    isWinner ? "text-winner" : hasWins ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="hidden sm:inline">
                    {model.wins}/{model.totalTurns}
                  </span>
                  <span className="inline sm:hidden">{model.wins}</span>
                </span>
              </Badge>
            );
          })}
        </div>
      )}
    </header>
  );
}
