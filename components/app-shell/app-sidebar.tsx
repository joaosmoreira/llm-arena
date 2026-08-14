"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { Trophy, LayoutDashboard, Award, Layers, Plus, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export interface ThreadItem {
  id: string;
  title: string;
  updatedAt: string;
  isActive?: boolean;
}

const PLACEHOLDER_THREADS: ThreadItem[] = [
  {
    id: "thread-1",
    title: "Quantum physics superposition intro",
    updatedAt: "10m ago",
    isActive: true,
  },
  {
    id: "thread-2",
    title: "Rust vs Go memory concurrency",
    updatedAt: "2h ago",
  },
  {
    id: "thread-3",
    title: "PostgreSQL indexing & B-tree query plan",
    updatedAt: "Yesterday",
  },
  {
    id: "thread-4",
    title: "Explain Transformers architecture",
    updatedAt: "2 days ago",
  },
];

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();

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

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {PLACEHOLDER_THREADS.map((thread) => {
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
                {isCurrentActive && <span className="bg-primary size-1.5 shrink-0 rounded-full" />}
              </Link>
            );
          })}
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
