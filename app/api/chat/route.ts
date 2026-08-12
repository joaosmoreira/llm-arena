import { streamText } from "ai";
import { z } from "zod";
import { detectBot, detectPromptInjection, tokenBucket } from "@arcjet/next";
import { aj } from "@/infrastructure/arcjet";
import { getLanguageModel } from "@/lib/ai/openrouter";
import { auth } from "@clerk/nextjs/server";

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
    // 1. Require sign-in on /api/chat
    // Cheaper than paying for an Arcjet decision on a request that cannot proceed
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        {
          error: "Please sign in to send prompts and vote on models.",
          retryable: false,
        },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await req.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request payload. Please check the model and prompt format.",
          details: parsed.error.flatten().fieldErrors,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const { modelId, messages, threadId } = parsed.data;
    const lastUserPrompt =
      [...messages].reverse().find((m) => m.role === "user")?.content || "prompt";

    // 3. Layer route rules onto base Arcjet client
    const protectedAj = aj
      .withRule(
        detectBot({
          mode: "LIVE",
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
          mode: "LIVE",
        })
      );

    const decision = await protectedAj.protect(req, {
      userId,
      requested: 1,
      detectPromptInjectionMessage: lastUserPrompt,
    });

    if (decision.isErrored()) {
      // Fail open: log server-side and let legitimate requests through if Arcjet encounters an issue
      console.warn("[Arcjet Service Warning]", decision.reason.message);
    } else if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return Response.json(
          {
            error: "Too many requests. Please wait a moment before sending another prompt.",
            retryable: true,
          },
          {
            status: 429,
            headers: {
              "Retry-After": "10",
            },
          }
        );
      }
      if (decision.reason.isPromptInjection()) {
        return Response.json(
          {
            error: "This prompt was blocked by our prompt-injection safety filters.",
            retryable: false,
          },
          { status: 400 }
        );
      }
      if (decision.reason.isBot()) {
        return Response.json(
          {
            error: "Automated clients are not permitted.",
            retryable: false,
          },
          { status: 403 }
        );
      }
      return Response.json(
        {
          error: "Request was blocked by security policy.",
          retryable: false,
        },
        { status: 403 }
      );
    }

    // 4. Instantiate model with OpenRouter + PostHog tracing
    const model = getLanguageModel(modelId, { userId, threadId });

    // 5. Stream response
    const result = streamText({
      model,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error("[Chat API Error]", error);

    const errorMessage =
      error instanceof Error && error.message.includes("API key")
        ? "OpenRouter API key is not configured or is invalid. Please check your settings."
        : "Failed to connect to the model. Please try again.";

    return Response.json(
      {
        error: errorMessage,
        retryable: true,
      },
      { status: 500 }
    );
  }
}
