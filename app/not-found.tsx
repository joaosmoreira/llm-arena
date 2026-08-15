import Link from "next/link";
import { Swords } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";

export const metadata = {
  title: "Thread Not Found | LLM Arena",
  description: "The requested battle thread could not be found.",
};

export default function NotFound() {
  return (
    <AppShell breadcrumb="Arena" threadTitle="Not Found">
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="bg-primary/10 border-primary/20 text-primary mb-4 flex size-12 items-center justify-center rounded-2xl border shadow-sm">
          <Swords className="size-6" />
        </div>
        <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
          Thread not found
        </h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-xs leading-relaxed sm:text-sm">
          This battle thread does not exist or may have been deleted.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
          >
            Start a new battle
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
