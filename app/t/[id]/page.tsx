import { notFound } from "next/navigation";
import { getThreadById } from "@/lib/db/queries";
import { fetchModelCatalog, getLetterForModel } from "@/infrastructure/fetch-model-catalog";
import { ArenaThreadView } from "@/components/arena/arena-thread-view";
import { type OpenRouterModel } from "@/infrastructure/model-catalog";

interface ThreadPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const thread = await getThreadById(id);

  if (!thread) {
    notFound();
  }

  // Fetch full model catalog to resolve names/letters
  const catalog = await fetchModelCatalog();
  const catalogMap = new Map(catalog.map((m) => [m.id, m]));

  // Extract distinct model IDs from turn responses
  const distinctModelIds = new Set<string>();
  thread.turns.forEach((turn) => {
    turn.responses.forEach((res) => {
      distinctModelIds.add(res.modelId);
    });
  });

  const threadModels: OpenRouterModel[] = Array.from(distinctModelIds).map((modelId) => {
    const catalogModel = catalogMap.get(modelId);
    if (catalogModel) return catalogModel;

    const shortName = modelId.split("/").pop()?.replace(":free", "") || modelId;
    return {
      id: modelId,
      name: shortName,
      shortName,
      letter: getLetterForModel(shortName, modelId),
      description: "",
      contextLength: 4096,
      formattedContext: "4K",
      pricing: { prompt: "0", completion: "0" },
      provider: modelId.split("/")[0] || "Custom",
    };
  });

  // Serialize thread data for client
  const serializedThread = {
    id: thread.id,
    title: thread.title,
    turns: thread.turns.map((turn) => ({
      id: turn.id,
      prompt: turn.prompt,
      createdAt: turn.createdAt.toISOString(),
      responses: turn.responses.map((res) => ({
        id: res.id,
        modelId: res.modelId,
        modelName: res.modelName,
        text: res.text,
        status: res.status,
        timeToFirstTokenMs: res.timeToFirstTokenMs,
        tokensPerSecond: res.tokensPerSecond,
        totalTokens: res.totalTokens,
        costUsd: res.costUsd,
        errorMessage: res.errorMessage,
      })),
      vote: turn.vote
        ? {
            id: turn.vote.id,
            modelResponseId: turn.vote.modelResponseId,
            modelResponse: {
              modelId: turn.vote.modelResponse.modelId,
            },
          }
        : null,
    })),
  };

  return <ArenaThreadView thread={serializedThread} threadModels={threadModels} />;
}
