"use client";

import * as React from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader, type ModelWinRecord } from "./app-header";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: string;
  threadTitle?: string;
  modelRecords?: ModelWinRecord[];
  showCopyLink?: boolean;
}

export function AppShell({
  children,
  breadcrumb,
  threadTitle,
  modelRecords,
  showCopyLink = false,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="bg-background text-foreground flex h-screen w-full overflow-hidden font-sans">
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="bg-background/80 fixed inset-0 z-30 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent / Responsive Left Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 h-full md:relative md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-200 ease-in-out md:transition-none`}
      >
        <AppSidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main Column */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky Top Header */}
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          breadcrumb={breadcrumb}
          threadTitle={threadTitle}
          modelRecords={modelRecords}
          showCopyLink={showCopyLink}
        />

        {/* Scrollable Work Area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
