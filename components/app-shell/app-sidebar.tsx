"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { Trophy, LayoutDashboard, Award, Layers, Plus, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/infrastructure/ui-kit/theme-toggle";
import { Button } from "@/infrastructure/ui-kit/button";

interface AppSidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export interface ThreadItem {
  id: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
  _count?: {
    turns: number;
  };
}

type TimeBucket = "Today" | "This week" | "Earlier";

interface GroupedThreads {
  readonly label: TimeBucket;
  readonly threads: readonly ThreadItem[];
}

function groupThreadsByTime(threads: readonly ThreadItem[]): readonly GroupedThreads[] {
  const now = new Date();
  // Start of today (local time midnight)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Start of 7 days ago
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const today: ThreadItem[] = [];
  const thisWeek: ThreadItem[] = [];
  const earlier: ThreadItem[] = [];

  for (const thread of threads) {
    const rawDate = thread.updatedAt || thread.createdAt;
    const threadTime = rawDate ? new Date(rawDate).getTime() : 0;

    if (threadTime >= startOfToday) {
      today.push(thread);
    } else if (threadTime >= sevenDaysAgo) {
      thisWeek.push(thread);
    } else {
      earlier.push(thread);
    }
  }

  const groups: GroupedThreads[] = [];
  if (today.length > 0) groups.push({ label: "Today", threads: today });
  if (thisWeek.length > 0) groups.push({ label: "This week", threads: thisWeek });
  if (earlier.length > 0) groups.push({ label: "Earlier", threads: earlier });

  return groups;
}

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const [threads, setThreads] = React.useState<readonly ThreadItem[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    fetch("/api/threads")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data.threads)) {
          setThreads(data.threads);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isSignedIn, pathname]);

  const displayedThreads = threads;
  const groupedThreads = React.useMemo(
    () => groupThreadsByTime(displayedThreads),
    [displayedThreads]
  );

  return (
    <aside
      className={`border-border bg-card flex h-full shrink-0 flex-col border-r transition-all duration-200 ease-in-out ${
        isOpen ? "w-64" : "w-0 -translate-x-full overflow-hidden border-none p-0 opacity-0"
      }`}
      aria-label="Application Sidebar"
    >
      {/* Brand Header */}
      <div className="border-border/60 flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md font-semibold shadow-sm">
          <Trophy className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-semibold tracking-tight">LLM Arena</span>
          <span className="text-muted-foreground font-mono text-[10px]">
            3-Model Live Benchmark
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="mt-4 flex flex-col gap-1 px-3" aria-label="Main Navigation">
        <Link
          href="/"
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            pathname === "/"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="size-4" />
          Arena
        </Link>
        <Link
          href="/leaderboard"
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            pathname === "/leaderboard"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Award className="size-4" />
          Leaderboard
        </Link>
        <Link
          href="/models"
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            pathname === "/models"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="size-4" />
          Models
        </Link>
      </nav>

      {/* Thread History Section */}
      <div className="mt-6 flex flex-1 flex-col overflow-hidden px-3">
        <div className="text-muted-foreground flex items-center justify-between px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase">
          <span>Your Threads</span>
          <Link
            href="/"
            className="text-primary flex cursor-pointer items-center gap-1 text-[11px] font-medium hover:underline"
          >
            <Plus className="size-3" /> New
          </Link>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {displayedThreads.length === 0 ? (
            <div className="text-muted-foreground/70 px-2 py-4 text-center text-xs">
              {isSignedIn ? "No past battles yet." : "Sign in to view past battles."}
            </div>
          ) : (
            groupedThreads.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="text-muted-foreground/60 px-2.5 pt-1 font-mono text-[10px] font-semibold tracking-wider uppercase">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.threads.map((thread) => {
                    const isCurrentActive = pathname === `/t/${thread.id}`;
                    return (
                      <Link
                        key={thread.id}
                        href={`/t/${thread.id}`}
                        className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                          isCurrentActive
                            ? "bg-muted/90 text-foreground border-border/50 border font-medium"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <MessageSquare className="group-hover:text-primary size-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{thread.title}</span>
                        </div>
                        {isCurrentActive && (
                          <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer User Info & Theme Toggle */}
      <div className="border-border bg-card mt-auto flex shrink-0 items-center justify-between border-t p-3">
        <div className="flex min-w-0 items-center gap-2">
          {isSignedIn ? (
            <div className="flex min-w-0 items-center gap-2">
              <UserButton />
              <div className="flex min-w-0 flex-col">
                <span className="text-foreground truncate text-xs font-medium">
                  {user?.firstName ?? user?.username ?? "User"}
                </span>
                <span className="text-muted-foreground text-[10px]">Free Tier</span>
              </div>
            </div>
          ) : (
            <SignInButton mode="modal">
              <Button variant="outline" size="sm" className="h-7 cursor-pointer text-xs">
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
