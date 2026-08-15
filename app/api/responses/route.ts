import { saveModelResponse, getTurnById } from "@/lib/db/queries";
import { saveModelResponseSchema } from "@/lib/db/schema";
import { getEffectiveUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const effectiveUserId = await getEffectiveUserId();

    if (!effectiveUserId) {
      return Response.json(
        { error: "Authentication required to save response metrics.", retryable: false },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = saveModelResponseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid model response payload.",
          details: parsed.error.flatten().fieldErrors,
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Resolve turn to enforce thread ownership
    const turn = await getTurnById(parsed.data.turnId);
    if (!turn) {
      return Response.json({ error: "Turn was not found.", retryable: false }, { status: 404 });
    }

    if (turn.thread.user.clerkId !== effectiveUserId && turn.thread.userId !== effectiveUserId) {
      return Response.json(
        {
          error: "You do not have permission to modify responses for this conversation.",
          retryable: false,
        },
        { status: 403 }
      );
    }

    const saved = await saveModelResponse(parsed.data);

    return Response.json({
      ok: true,
      response: saved,
    });
  } catch (error: unknown) {
    console.error("[Save Model Response API Error]", error);
    return Response.json(
      {
        error: "Failed to persist model response metrics.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
