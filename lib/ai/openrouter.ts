import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { withTracing } from "@posthog/ai";
import { PostHog } from "posthog-node";

// Free tier default models for quick reference
export const DEFAULT_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "deepseek/deepseek-r1:free",
] as const;

let posthogNodeClient: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!projectToken || !host) return null;

  if (!posthogNodeClient) {
    posthogNodeClient = new PostHog(projectToken, { host });
  }
  return posthogNodeClient;
}

export function getOpenRouterProvider(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OpenRouter API key is missing. Please set OPENROUTER_API_KEY in your environment (.env.local)."
    );
  }

  return createOpenRouter({
    apiKey: key,
    headers: {
      "HTTP-Referer": "https://llm-arena.local",
      "X-Title": "LLM Arena",
    },
  });
}

export function getLanguageModel(
  modelId: string,
  options?: {
    userId?: string;
    threadId?: string;
  }
) {
  const openrouter = getOpenRouterProvider();
  const rawModel = openrouter(modelId);

  const phClient = getPostHogServerClient();
  if (phClient) {
    return withTracing(
      rawModel as unknown as Parameters<typeof withTracing>[0],
      phClient,
      {
        posthogDistinctId: options?.userId || "anonymous",
        posthogProperties: {
          threadId: options?.threadId,
          isFreeTier: true,
        },
      }
    );
  }

  return rawModel;
}
