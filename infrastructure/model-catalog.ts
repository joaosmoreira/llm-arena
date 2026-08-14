import { z } from "zod";

export const MAX_SELECTED_MODELS = 3;
export const MIN_SELECTED_MODELS = 1;

export interface OpenRouterModel {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly letter: string;
  readonly description: string;
  readonly contextLength: number;
  readonly formattedContext: string;
  readonly pricing: {
    readonly prompt: string;
    readonly completion: string;
  };
  readonly provider: string;
}

export const OpenRouterApiModelSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  context_length: z.number().optional().default(4096),
  pricing: z
    .object({
      prompt: z.string().optional().default("0"),
      completion: z.string().optional().default("0"),
    })
    .optional()
    .default({ prompt: "0", completion: "0" }),
});

export const FALLBACK_FREE_MODELS: readonly OpenRouterModel[] = [
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning",
    shortName: "Nemotron 3.5",
    letter: "N",
    description:
      "High-throughput agentic MoE model from NVIDIA with 1M context capacity for rapid reasoning and conversational benchmarking.",
    contextLength: 1000000,
    formattedContext: "1M",
    pricing: { prompt: "0", completion: "0" },
    provider: "NVIDIA",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Laguna S 2.1",
    shortName: "Laguna S",
    letter: "P",
    description:
      "Specialized coding and reasoning model from Poolside with 262K context window and fast parallel token generation.",
    contextLength: 262144,
    formattedContext: "262K",
    pricing: { prompt: "0", completion: "0" },
    provider: "Poolside",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "North Mini Code",
    shortName: "North Mini",
    letter: "C",
    description:
      "Agentic coding and reasoning model with 256K context capacity from Cohere for precise instruction adherence.",
    contextLength: 256000,
    formattedContext: "256K",
    pricing: { prompt: "0", completion: "0" },
    provider: "Cohere",
  },
  {
    id: "poolside/laguna-xs-2.1:free",
    name: "Laguna XS 2.1",
    shortName: "Laguna XS",
    letter: "P",
    description:
      "Compact 33B-A3B coding and reasoning agent from Poolside with high efficiency and deep code comprehension.",
    contextLength: 262144,
    formattedContext: "262K",
    pricing: { prompt: "0", completion: "0" },
    provider: "Poolside",
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "LFM 2.5 2.6B",
    shortName: "LFM 2.5",
    letter: "L",
    description:
      "Compact reasoning model from Liquid AI with 128K context for fast data extraction and reasoning tasks.",
    contextLength: 128000,
    formattedContext: "128K",
    pricing: { prompt: "0", completion: "0" },
    provider: "Liquid AI",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    shortName: "Nemotron Nano",
    letter: "N",
    description:
      "Small language MoE model from NVIDIA with 256K context capacity engineered for high compute efficiency.",
    contextLength: 256000,
    formattedContext: "256K",
    pricing: { prompt: "0", completion: "0" },
    provider: "NVIDIA",
  },
] as const;

export function formatContextLength(tokens: number): string {
  if (tokens >= 1000000) {
    const m = tokens / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    const k = Math.round(tokens / 1000);
    return `${k}K`;
  }
  return `${tokens}`;
}

export function cleanModelName(rawName: string, id: string): string {
  let name = rawName || id.split("/")[1] || id;
  name = name.replace(/\s*\(free\)\s*/gi, "").replace(/:free$/i, "");
  name = name.replace(/:\s+/g, " ");

  const provider = extractProvider(id);
  if (name.toLowerCase().startsWith(provider.toLowerCase() + " ")) {
    name = name.slice(provider.length + 1).trim();
  }

  return name.trim();
}

export function extractProvider(id: string): string {
  const prefix = id.split("/")[0] ?? "openrouter";
  switch (prefix.toLowerCase()) {
    case "nvidia":
      return "NVIDIA";
    case "meta-llama":
    case "meta":
      return "Meta";
    case "qwen":
      return "Alibaba Cloud";
    case "google":
      return "Google";
    case "mistralai":
    case "mistral":
      return "Mistral AI";
    case "deepseek":
      return "DeepSeek";
    case "cohere":
      return "Cohere";
    case "liquid":
      return "Liquid AI";
    case "poolside":
      return "Poolside";
    case "inclusionai":
    case "ling":
      return "inclusionAI";
    default:
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
}

/**
 * Pure parsing of a single raw OpenRouter API model row.
 * Returns an OpenRouterModel if valid free-tier, or null if invalid or paid.
 */
export function parseRawModelRow(raw: unknown): OpenRouterModel | null {
  const parsed = OpenRouterApiModelSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  const model = parsed.data;
  const isFreeId = model.id.toLowerCase().endsWith(":free");

  if (!isFreeId) {
    return null;
  }

  const cleanName = cleanModelName(model.name, model.id);
  const letter = cleanName.charAt(0).toUpperCase() || "M";
  const provider = extractProvider(model.id);
  const formattedContext = formatContextLength(model.context_length);

  return {
    id: model.id,
    name: cleanName,
    shortName: cleanName.split(" ")[0] || cleanName,
    letter,
    description: model.description || "High-performance inference model.",
    contextLength: model.context_length,
    formattedContext,
    pricing: model.pricing,
    provider,
  };
}

const PREFERRED_DEFAULT_IDS = [
  "nvidia/nemotron-3.5-lightning:free",
  "poolside/laguna-s-2.1:free",
  "cohere/north-mini-code:free",
  "liquid/lfm-2.5-2.6b:free",
  "poolside/laguna-xs-2.1:free",
];

/**
 * Derives default trio: verified fast models first, then distinct providers.
 * Purely derived dynamically with no I/O.
 */
export function getDefaultSelectedModels(
  models: readonly OpenRouterModel[]
): readonly OpenRouterModel[] {
  const selected: OpenRouterModel[] = [];

  // 1. Pick verified responsive models first
  for (const preferredId of PREFERRED_DEFAULT_IDS) {
    const found = models.find((m) => m.id === preferredId);
    if (found && !selected.some((s) => s.id === found.id)) {
      selected.push(found);
    }
    if (selected.length === MAX_SELECTED_MODELS) return selected;
  }

  // 2. Fill remaining from distinct providers
  const seenProviders = new Set<string>(selected.map((m) => m.provider));
  for (const model of models) {
    if (!seenProviders.has(model.provider)) {
      seenProviders.add(model.provider);
      selected.push(model);
    }
    if (selected.length === MAX_SELECTED_MODELS) break;
  }

  if (selected.length < MAX_SELECTED_MODELS) {
    for (const model of models) {
      if (!selected.some((m) => m.id === model.id)) {
        selected.push(model);
      }
      if (selected.length === MAX_SELECTED_MODELS) break;
    }
  }

  return selected;
}
