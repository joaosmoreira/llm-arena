import { z } from "zod";
import { createTurnWithResponses, getThreadById } from "@/lib/db/queries";
import { getEffectiveUserId } from "@/lib/auth";

const createTurnRequestSchema = z.object({
  threadId: z.string().min(1, "Thread ID is required"),
  prompt: z.string().min(1, "Prompt cannot be empty").max(10000),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const effectiveUserId = await getEffectiveUserId();

    if (!effectiveUserId) {
      return Response.json(
        { error: "Please sign in to send a follow-up message.", retryable: false },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = createTurnRequestSchema.safeParse(body);
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

    const { threadId, prompt } = parsed.data;

    // Verify thread exists
    const thread = await getThreadById(threadId);
    if (!thread) {
      return Response.json(
        { error: "Conversation thread was not found.", retryable: false },
        { status: 404 }
      );
    }

    // Enforce thread ownership
    if (thread.user.clerkId !== effectiveUserId && thread.userId !== effectiveUserId) {
      return Response.json(
        {
          error: "You do not have permission to add turns to this conversation.",
          retryable: false,
        },
        { status: 403 }
      );
    }

    // Find models used in this thread
    const distinctModels = new Map<string, string>();
    thread.turns.forEach((t) => {
      t.responses.forEach((r) => {
        distinctModels.set(r.modelId, r.modelName);
      });
    });

    // Create new turn with placeholder response rows
    const turn = await createTurnWithResponses(
      {
        threadId,
        prompt,
      },
      Array.from(distinctModels.entries()).map(([modelId, modelName]) => ({
        modelId,
        modelName,
        text: "",
        status: "STREAMING" as const,
        costUsd: 0,
      }))
    );

    return Response.json({
      ok: true,
      turnId: turn.id,
    });
  } catch (error: unknown) {
    console.error("[Create Turn API Error]", error);
    return Response.json(
      {
        error: "Failed to create follow-up turn. Please try again.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
