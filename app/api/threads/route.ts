import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  upsertUser,
  createThread,
  createTurnWithResponses,
  getUserThreads,
} from "@/lib/db/queries";
import { isAllowedFreeModel, fetchModelCatalog } from "@/infrastructure/fetch-model-catalog";
import { env } from "@/lib/env";

const DEV_USER_ID = "cmss98a790000tis7rvxgthkw";

const createThreadRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(10000),
  modelIds: z
    .array(z.string().min(1))
    .min(1, "At least one model must be selected")
    .max(3, "Maximum 3 models allowed"),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId: authUserId } = await auth();
    const effectiveUserId = authUserId || (env.isDevelopment ? DEV_USER_ID : null);

    if (!effectiveUserId) {
      return Response.json(
        { error: "Please sign in to start a new arena battle.", retryable: false },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = createThreadRequestSchema.safeParse(body);
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

    const { prompt, modelIds } = parsed.data;

    // Validate that all requested models are allowed free models
    const validationResults = await Promise.all(modelIds.map((id) => isAllowedFreeModel(id)));
    if (validationResults.some((allowed) => !allowed)) {
      return Response.json(
        {
          error: "One or more selected models are not in the allowed free catalog.",
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Sync Clerk user with local DB
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

    // Create title from first prompt (clean, single-line, max 50 chars)
    const firstLine = prompt.trim().split("\n")[0] || "New Arena Battle";
    const title = firstLine.length > 50 ? `${firstLine.slice(0, 47)}...` : firstLine;

    // Create Thread
    const thread = await createThread({
      userId: dbUser.id,
      title,
    });

    // Create initial Turn with placeholder response records for each selected model
    const catalog = await fetchModelCatalog();
    const catalogMap = new Map(catalog.map((m) => [m.id, m]));

    const turn = await createTurnWithResponses(
      {
        threadId: thread.id,
        prompt,
      },
      modelIds.map((modelId) => {
        const model = catalogMap.get(modelId);
        const modelName = model?.name || modelId.split("/").pop() || modelId;
        return {
          modelId,
          modelName,
          text: "",
          status: "STREAMING" as const,
          costUsd: 0,
        };
      })
    );

    return Response.json({
      ok: true,
      threadId: thread.id,
      turnId: turn.id,
    });
  } catch (error: unknown) {
    console.error("[Create Thread API Error]", error);
    return Response.json(
      {
        error: "Failed to create conversation thread. Please try again.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId: authUserId } = await auth();
    const effectiveUserId = authUserId || (env.isDevelopment ? DEV_USER_ID : null);
    if (!effectiveUserId) {
      return Response.json({ threads: [] });
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

    const threads = await getUserThreads(dbUser.id);
    return Response.json({ threads });
  } catch (error: unknown) {
    console.error("[Get User Threads API Error]", error);
    return Response.json({ threads: [] }, { status: 500 });
  }
}
