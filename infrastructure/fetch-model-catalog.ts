import "server-only";
import { type OpenRouterModel, FALLBACK_FREE_MODELS, parseRawModelRow } from "./model-catalog";

/**
 * Fetches live free-tier models from OpenRouter API sorted by context length descending.
 * Uses row-by-row Zod parsing so any individual bad row is dropped without emptying the list.
 * Cached at 1 hour with Next.js ISR.
 */
export async function fetchAvailableFreeModels(): Promise<readonly OpenRouterModel[]> {
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

    const json = (await response.json()) as { data?: unknown };
    if (!json || !Array.isArray(json.data)) {
      return FALLBACK_FREE_MODELS;
    }

    const validFreeModels: OpenRouterModel[] = [];

    for (const rawRow of json.data) {
      const model = parseRawModelRow(rawRow);
      if (model) {
        validFreeModels.push(model);
      }
    }

    if (validFreeModels.length === 0) {
      return FALLBACK_FREE_MODELS;
    }

    // Sort by context length descending (highest context window first)
    return validFreeModels.sort((a, b) => b.contextLength - a.contextLength);
  } catch {
    return FALLBACK_FREE_MODELS;
  }
}

export const fetchModelCatalog = fetchAvailableFreeModels;

/**
 * Validates whether a modelId belongs to the live or fallback free model catalog.
 * Used by /api/chat and /api/threads to reject unauthorized paid models.
 */
export async function isAllowedFreeModel(modelId: string): Promise<boolean> {
  if (!modelId || typeof modelId !== "string") return false;

  const normalized = modelId.trim().toLowerCase();

  // Any model ending with :free is inherently a free-tier model on OpenRouter
  if (normalized.endsWith(":free")) {
    return true;
  }

  const models = await fetchAvailableFreeModels();
  if (models.some((m) => m.id.toLowerCase() === normalized)) {
    return true;
  }

  return FALLBACK_FREE_MODELS.some((m) => m.id.toLowerCase() === normalized);
}

export function getLetterForModel(name: string, id: string): string {
  const clean = name || id.split("/").pop() || "M";
  return clean.charAt(0).toUpperCase();
}
