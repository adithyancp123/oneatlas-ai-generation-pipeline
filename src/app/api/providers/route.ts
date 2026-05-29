import { buildProvidersOverview } from "@/lib/ai/providers/status";
import { jsonSuccess } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const overview = buildProvidersOverview();
  return jsonSuccess(overview);
}
