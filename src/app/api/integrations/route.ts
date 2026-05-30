import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import { jsonSuccess } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface IntegrationsListResponse {
  integrations: typeof INTEGRATION_REGISTRY;
  total: number;
}

export async function GET(): Promise<Response> {
  const response: IntegrationsListResponse = {
    integrations: INTEGRATION_REGISTRY,
    total: INTEGRATION_REGISTRY.length,
  };
  return jsonSuccess(response);
}
