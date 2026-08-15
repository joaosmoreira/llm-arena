import { z } from "zod";
import { detectBot, detectPromptInjection, tokenBucket } from "@arcjet/next";
import { aj } from "@/infrastructure/arcjet";
import { isAllowedFreeModel } from "@/infrastructure/fetch-model-catalog";
import { getEffectiveUserId } from "@/lib/auth";
import { env } from "@/lib/env";

const chatRequestSchema = z.object({
  modelId: z.string().min(1, "Model ID is required"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .min(1, "At least one message is required"),
  threadId: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const effectiveUserId = await getEffectiveUserId();

    const body = await req
      .clone()
      .json()
      .catch(() => null);
    const parsed = chatRequestSchema.safeParse(body);
    const lastUserPrompt = parsed.success
      ? [...parsed.data.messages].reverse().find((m) => m.role === "user")?.content
      : undefined;

    const protectedAj = aj
      .withRule(
        detectBot({
          mode: env.isDevelopment ? "DRY_RUN" : "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE"],
        })
      )
      .withRule(
        tokenBucket({
          mode: "LIVE",
          refillRate: 5,
          interval: 10,
          capacity: 10,
          characteristics: ["userId"],
        })
      )
      .withRule(
        detectPromptInjection({
          mode: "DRY_RUN",
        })
      );

    const decision = await protectedAj.protect(req, {
      userId: effectiveUserId || "anonymous",
      requested: 1,
      detectPromptInjectionMessage: lastUserPrompt || "",
    });

    if (decision.isErrored()) {
      console.warn("[Arcjet Service Warning]", decision.reason.message);
    } else if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return Response.json(
          {
            error: "Too many requests. Please wait a moment before sending another prompt.",
            retryable: true,
          },
          { status: 429, headers: { "Retry-After": "10" } }
        );
      }
      if (decision.reason.isBot()) {
        return Response.json(
          { error: "Automated clients are not permitted.", retryable: false },
          { status: 403 }
        );
      }
      return Response.json(
        { error: "Request was blocked by security policy.", retryable: false },
        { status: 403 }
      );
    }

    if (!effectiveUserId) {
      return Response.json(
        { error: "Please sign in to send prompts and vote on models.", retryable: false },
        { status: 401 }
      );
    }

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request payload.",
          details: parsed.error.flatten().fieldErrors,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const { modelId, messages, threadId } = parsed.data;

    const isFree = await isAllowedFreeModel(modelId);
    if (!isFree) {
      return Response.json(
        {
          error: "The requested model is not part of the allowed free model catalog.",
          retryable: false,
        },
        { status: 400 }
      );
    }

    console.log(`[Chat API] Starting stream for model: ${modelId}, threadId: ${threadId}`);

    const key1 = env.OPENROUTER_API_KEY_1;
    const key2 = env.OPENROUTER_API_KEY_2;

    if (!key1 && !key2) {
      return Response.json(
        { error: "No OpenRouter API key configured.", retryable: false },
        { status: 500 }
      );
    }

    const makeRequest = async (apiKey: string) =>
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://llm-arena.vercel.app",
          "X-Title": "LLM Arena",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: true,
        }),
      });

    // Try key1, fall back to key2 on daily quota
    let upstreamRes = key1 ? await makeRequest(key1) : null;

    if (upstreamRes && !upstreamRes.ok && upstreamRes.status === 429 && key2) {
      const errBody = (await upstreamRes.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (errBody?.error?.message?.includes("free-models-per-day")) {
        console.warn(
          `[Chat API] OPROUTER1 daily limit hit for ${modelId}, falling back to OPROUTER2`
        );
        upstreamRes = await makeRequest(key2);
      }
    }

    if (!upstreamRes && key2) {
      upstreamRes = await makeRequest(key2);
    }

    const upstream = upstreamRes!;

    if (!upstream.ok) {
      const errBody = (await upstream.json().catch(() => ({}))) as { error?: { message?: string } };
      const raw = errBody?.error?.message ?? `HTTP ${upstream.status}`;

      let friendly: string;
      if (raw.includes("free-models-per-day")) {
        friendly =
          "OpenRouter daily free-tier limit reached on all keys. Please try again later or wait for daily reset at midnight UTC.";
      } else if (upstream.status === 429) {
        friendly = "Model rate limit reached. Please wait a few seconds and try again.";
      } else if (upstream.status === 401) {
        friendly = "AI provider authentication failed. Please check system configuration.";
      } else if (upstream.status === 502 || upstream.status === 503 || upstream.status === 504) {
        friendly =
          "The model provider is temporarily unavailable. Please try again in a few moments.";
      } else {
        friendly = "The model provider returned an unexpected error. Please retry your prompt.";
      }

      console.error(`[Chat API] Upstream error (${upstream.status}) for ${modelId}:`, raw);
      return Response.json(
        { error: friendly, retryable: upstream.status === 429 || upstream.status >= 500 },
        { status: upstream.status }
      );
    }

    // Pass the raw SSE stream directly to the client.
    // The client will parse the SSE data lines itself.
    // This avoids ALL buffering issues with Next.js 16 + Turbopack.
    console.log(`[Chat API] Piping raw SSE stream for ${modelId}`);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("[Chat API Error]", error);
    return Response.json(
      { error: "Failed to connect to the model. Please try again.", retryable: true },
      { status: 500 }
    );
  }
}
