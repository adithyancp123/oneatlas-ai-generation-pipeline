import { providerExecutionFromGateway } from "@/lib/ai/provider-execution";
import type { AIGatewayResponse } from "@/lib/ai/gateway/types";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

export function stageProviderExecutionFromGateway<T>(
  response: AIGatewayResponse<T>,
): ProviderExecutionMeta {
  return providerExecutionFromGateway(response);
}
