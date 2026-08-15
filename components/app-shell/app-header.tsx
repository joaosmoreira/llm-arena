"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeft, Link2, Check } from "lucide-react";
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
  showCopyLink?: boolean;
}

export function AppHeader({
  sidebarOpen,
  onToggleSidebar,
  breadcrumb = "Arena",
  threadTitle = "New Battle",
  modelRecords = [],
  showCopyLink = false,
}: AppHeaderProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };
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

      {/* Right: Model Win Pills & Copy Link Button */}
      <div className="flex shrink-0 items-center gap-2 pl-2">
        {modelRecords.length > 0 && (
          <div
            className="flex shrink-0 items-center gap-1.5"
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
                      isWinner
                        ? "text-winner"
                        : hasWins
                          ? "text-foreground"
                          : "text-muted-foreground"
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

        {/* Copy Link Button */}
        {showCopyLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground h-7 cursor-pointer gap-1.5 px-2 text-xs font-medium transition-colors"
            title="Copy link to clipboard"
            aria-label="Copy shareable link"
          >
            {copied ? (
              <>
                <Check className="text-winner size-3.5" />
                <span className="text-winner font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Link2 className="size-3.5 opacity-70" />
                <span className="hidden sm:inline">Copy link</span>
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
