import { fetchAvailableFreeModels } from "@/infrastructure/fetch-model-catalog";
import { getDefaultSelectedModels } from "@/infrastructure/model-catalog";

export const runtime = "nodejs";

export async function GET() {
  const models = await fetchAvailableFreeModels();
  const defaultSelected = getDefaultSelectedModels(models);

  return Response.json(
    {
      models,
      defaultSelectedModelIds: defaultSelected.map((m) => m.id),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
