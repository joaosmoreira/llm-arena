import { auth } from "@clerk/nextjs/server";
import { saveModelResponse } from "@/lib/db/queries";
import { saveModelResponseSchema } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId: authUserId } = await auth();
    const effectiveUserId = authUserId || (env.isDevelopment ? "cmss98a790000tis7rvxgthkw" : null);

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
