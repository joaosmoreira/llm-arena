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
  threadTitle = "Quantum physics superposition intro",
  modelRecords = [
    {
      id: "nemotron",
      letter: "N",
      name: "Nemotron",
      wins: 2,
      totalTurns: 3,
      isCurrentWinner: true,
    },
    { id: "qwen", letter: "Q", name: "Qwen 2.5", wins: 1, totalTurns: 3 },
    { id: "llama", letter: "L", name: "Llama 3.3", wins: 0, totalTurns: 3 },
  ],
}: AppHeaderProps) {
  return (
    <header className="border-border bg-card/60 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md transition-colors sm:px-6">
      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
        </Button>

        <div className="flex items-center gap-2 truncate text-xs">
          <span className="text-muted-foreground">{breadcrumb}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground truncate font-semibold">{threadTitle}</span>
        </div>
      </div>

      {/* Right: Model Win Pills for Current Thread */}
      <div className="flex shrink-0 items-center gap-1.5 pl-2">
        {modelRecords.map((model) => (
          <Badge
            key={model.id}
            variant="secondary"
            className="border-border/70 flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] transition-colors"
          >
            <span
              className={`font-semibold ${
                model.isCurrentWinner ? "text-winner font-bold" : "text-primary"
              }`}
            >
              {model.letter}
            </span>
            <span className="text-muted-foreground hidden sm:inline">{model.name}</span>
            <span className="text-foreground font-semibold">
              {model.wins}/{model.totalTurns}
            </span>
          </Badge>
        ))}
      </div>
    </header>
  );
}
