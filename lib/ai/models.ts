import { z } from "zod";

export interface OpenRouterModel {
  id: string;
  name: string;
  shortName: string;
  letter: string;
  description: string;
  contextLength: number;
  formattedContext: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  provider: string;
}

const OpenRouterApiModelSchema = z.object({
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

const OpenRouterApiResponseSchema = z.object({
  data: z.array(OpenRouterApiModelSchema),
});

export const FALLBACK_FREE_MODELS: OpenRouterModel[] = [
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA Nemotron 3.5",
    shortName: "Nemotron",
    letter: "N",
    description:
      "High-efficiency reasoning and generation model tailored for fast throughput, code synthesis, and low-latency benchmark answering.",
    contextLength: 131072,
    formattedContext: "131k",
    pricing: { prompt: "0", completion: "0" },
    provider: "NVIDIA",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    name: "Qwen 2.5 72B",
    shortName: "Qwen 2.5",
    letter: "Q",
    description:
      "Flagship open-weights model excelling at mathematics, multilingual reasoning, code comprehension, and instruction following.",
    contextLength: 131072,
    formattedContext: "131k",
    pricing: { prompt: "0", completion: "0" },
    provider: "Alibaba Cloud",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    shortName: "Llama 3.3",
    letter: "L",
    description:
      "Industry benchmark open model with deep general knowledge, nuanced conversation ability, and fast parallel generation.",
    contextLength: 128000,
    formattedContext: "128k",
    pricing: { prompt: "0", completion: "0" },
    provider: "Meta",
  },
  {
    id: "mistralai/mistral-nemo:free",
    name: "Mistral Nemo 12B",
    shortName: "Mistral Nemo",
    letter: "M",
    description:
      "Compact, ultra-fast model built in collaboration with NVIDIA, providing agile response times and precise instruction adhering.",
    contextLength: 128000,
    formattedContext: "128k",
    pricing: { prompt: "0", completion: "0" },
    provider: "Mistral AI",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    shortName: "DeepSeek R1",
    letter: "D",
    description:
      "Chain-of-thought reasoning model designed to produce explicit step-by-step thinking for logic puzzles and complex problems.",
    contextLength: 65536,
    formattedContext: "64k",
    pricing: { prompt: "0", completion: "0" },
    provider: "DeepSeek",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    shortName: "Gemini Flash",
    letter: "G",
    description:
      "Next-generation multimodal model with massive 1M token context capacity and ultra-responsive generation speeds.",
    contextLength: 1048576,
    formattedContext: "1M",
    pricing: { prompt: "0", completion: "0" },
    provider: "Google",
  },
];

export function formatContextLength(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`;
  }
  return `${tokens}`;
}

export function cleanModelName(rawName: string, id: string): string {
  let name = rawName || id.split("/")[1] || id;
  // Clean up suffixes like ':free' or '(free)'
  name = name.replace(/\s*\(free\)\s*/gi, "").replace(/:free$/i, "");
  // Clean up duplicate provider prefixes if redundant e.g. "NVIDIA: " -> "NVIDIA "
  name = name.replace(/:\s+/g, " ");
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
    default:
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
}

/**
 * Fetches live free-tier models from OpenRouter API sorted by context length descending.
 * Falls back to curated static list if network or upstream error occurs.
 */
export async function getAvailableFreeModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "User-Agent": "LLM-Arena/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return FALLBACK_FREE_MODELS;
    }

    const json = await response.json();
    const parsed = OpenRouterApiResponseSchema.safeParse(json);

    if (!parsed.success) {
      return FALLBACK_FREE_MODELS;
    }

    const freeModels = parsed.data.data
      .filter((model) => {
        const isFreeId = model.id.toLowerCase().endsWith(":free");
        const isFreePricing = model.pricing.prompt === "0" && model.pricing.completion === "0";
        return isFreeId || isFreePricing;
      })
      .map((model) => {
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
      })
      // Sort by context length descending (largest context window first)
      .sort((a, b) => b.contextLength - a.contextLength);

    return freeModels.length > 0 ? freeModels : FALLBACK_FREE_MODELS;
  } catch {
    return FALLBACK_FREE_MODELS;
  }
}
