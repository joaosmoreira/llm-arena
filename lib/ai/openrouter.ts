import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

// Free tier default models for quick reference
export const DEFAULT_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "deepseek/deepseek-r1:free",
] as const;

let posthogNodeClient: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  const projectToken = env.POSTHOG_API_KEY || env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = env.POSTHOG_HOST;
  if (!projectToken || !host) return null;

  if (!posthogNodeClient) {
    posthogNodeClient = new PostHog(projectToken, { host });
  }
  return posthogNodeClient;
}

export function getOpenRouterProvider(apiKey?: string) {
  const key = apiKey || env.OPENROUTER_API_KEY;
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
  _options?: {
    userId?: string;
    threadId?: string;
  }
) {
  const openrouter = getOpenRouterProvider();
  return openrouter(modelId);
}
