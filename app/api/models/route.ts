import { NextResponse } from "next/server";
import { getAvailableFreeModels } from "@/lib/ai/models";

export async function GET() {
  const models = await getAvailableFreeModels();
  return NextResponse.json(
    { models },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
