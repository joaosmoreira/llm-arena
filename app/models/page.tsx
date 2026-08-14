import { Layers, Coins, Cpu, CheckCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAvailableFreeModels } from "@/lib/ai/models";

export const metadata = {
  title: "Models Catalog | LLM Arena",
  description:
    "Browse live free-tier models available on OpenRouter for head-to-head benchmarking.",
};

export default async function ModelsPage() {
  const models = await getAvailableFreeModels();

  return (
    <AppShell breadcrumb="Models" threadTitle="OpenRouter Free-Tier Catalog">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="border-border border-b pb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                Free-Tier
              </Badge>
              <span className="text-muted-foreground text-xs">OpenRouter Live API</span>
            </div>
            <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Model Catalog
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Browse all {models.length} free-tier models sorted by context window, available for
              head-to-head benchmarking.
            </p>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model, index) => (
              <Card key={model.id} className="border-border bg-card flex flex-col justify-between">
                <CardHeader className="space-y-1.5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="bg-muted text-foreground flex size-8 items-center justify-center rounded-full font-mono text-xs font-semibold">
                      {model.letter}
                    </div>
                    {index < 3 && (
                      <Badge variant="default" className="gap-1 text-[10px]">
                        <Sparkles className="size-2.5" /> Top Context
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-foreground text-base font-semibold">
                    {model.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground truncate font-mono text-[11px]">
                    {model.id}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <p className="text-foreground/80 line-clamp-3 text-xs leading-relaxed">
                    {model.description}
                  </p>

                  <div className="border-border/60 bg-muted/30 space-y-1.5 rounded-md border p-2.5 font-mono text-[11px]">
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Cpu className="text-primary size-3" /> Context Window
                      </span>
                      <span className="text-foreground font-semibold">
                        {model.formattedContext} ({model.contextLength.toLocaleString()} tokens)
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Coins className="text-primary size-3" /> Cost
                      </span>
                      <span className="text-foreground font-semibold">$0.00 / free</span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Layers className="text-primary size-3" /> Provider
                      </span>
                      <span className="text-foreground font-semibold">{model.provider}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-border/60 text-muted-foreground border-t pt-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="text-winner size-3.5" />
                    <span>Live in Arena picker</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
