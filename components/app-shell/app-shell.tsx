"use client";

import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader, type ModelWinRecord } from "./app-header";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: string;
  threadTitle?: string;
  modelRecords?: ModelWinRecord[];
}

export function AppShell({ children, breadcrumb, threadTitle, modelRecords }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="bg-background text-foreground flex h-screen w-full overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <AppSidebar isOpen={sidebarOpen} />

      {/* Main Column */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky Top Header */}
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          breadcrumb={breadcrumb}
          threadTitle={threadTitle}
          modelRecords={modelRecords}
        />

        {/* Scrollable Work Area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
