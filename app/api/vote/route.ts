import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { castVote, upsertUser } from "@/lib/db/queries";
import { getEffectiveUserId, DEV_USER_ID } from "@/lib/auth";

const voteRequestSchema = z.object({
  turnId: z.string().min(1, "Turn ID is required"),
  modelResponseId: z.string().min(1, "Model Response ID is required"),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const effectiveUserId = await getEffectiveUserId();

    if (!effectiveUserId) {
      return Response.json(
        { error: "Please sign in to vote for a model.", retryable: false },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = voteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid vote payload.",
          details: parsed.error.flatten().fieldErrors,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const clerkUser = await currentUser();
    const dbUser = await upsertUser({
      clerkId: effectiveUserId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? `dev-${DEV_USER_ID}@localhost`,
      name: clerkUser
        ? clerkUser.firstName || clerkUser.lastName
          ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim()
          : clerkUser.username || "Dev User"
        : "Dev User",
      imageUrl: clerkUser?.imageUrl,
    });

    const { turnId, modelResponseId } = parsed.data;

    const result = await castVote({
      turnId,
      userId: dbUser.id,
      modelResponseId,
    });

    if (!result.ok) {
      switch (result.refusal) {
        case "unauthorized":
          return Response.json(
            {
              error: "You do not have permission to vote on this conversation.",
              retryable: false,
            },
            { status: 403 }
          );
        case "already-voted":
          return Response.json(
            { error: "A vote has already been cast for this turn.", retryable: false },
            { status: 409 }
          );
        case "not-enough-responses":
          return Response.json(
            {
              error: "Voting requires at least 2 completed model answers in this turn.",
              retryable: false,
            },
            { status: 400 }
          );
        case "turn-not-found":
          return Response.json(
            { error: "Conversational turn not found.", retryable: false },
            { status: 404 }
          );
        case "invalid-response":
          return Response.json(
            { error: "Selected model response does not belong to this turn.", retryable: false },
            { status: 400 }
          );
      }
    }

    return Response.json({
      ok: true,
      vote: result.vote,
    });
  } catch (error: unknown) {
    console.error("[Cast Vote API Error]", error);
    return Response.json(
      {
        error: "Failed to cast vote. Please try again.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
