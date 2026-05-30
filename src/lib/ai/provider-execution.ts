import type { AIGatewayResponse } from "@/lib/ai/gateway/types";
import type { ProviderExecutionMeta, ProviderExecutionMode } from "@/types/provider-execution";

export function providerExecutionFromGateway<T>(
  response: AIGatewayResponse<T>,
): ProviderExecutionMeta {
  if (response.execution) {
    return response.execution;
  }
  return {
    provider: response.provider,
    model: response.model,
    mode: response.mock ? "mock" : "live",
    latencyMs: response.latencyMs,
  };
}

export function applyRoutingExecution(
  response: AIGatewayResponse<string>,
  attemptIndex: number,
  primaryProvider: string,
): ProviderExecutionMeta {
  const base = providerExecutionFromGateway(response);

  if (attemptIndex === 0) {
    return base;
  }

  if (!response.mock) {
    return {
      ...base,
      mode: "live",
      fallbackReason:
        base.fallbackReason ??
        `Routed to fallback provider after primary (${primaryProvider}) did not succeed`,
    };
  }

  return {
    ...base,
    mode: "fallback",
    fallbackReason:
      base.fallbackReason ??
      `Routed to fallback provider (${response.provider}); mock output used`,
  };
}

export function formatProviderExecutionLabel(execution: ProviderExecutionMeta): string {
  const providerLabel =
    execution.provider.charAt(0).toUpperCase() + execution.provider.slice(1);
  const modeLabel: string =
    execution.mode === "live"
      ? "live"
      : execution.mode === "mock"
        ? "mock"
        : "fallback(mock)";
  return `${providerLabel} • ${modeLabel}`;
}

export function hasMockExecution(
  executions: readonly ProviderExecutionMeta[] | undefined,
): boolean {
  return (executions ?? []).some((entry) => entry.mode === "mock" || entry.mode === "fallback");
}

export function executionModeFromMock(
  mock: boolean,
  sdkFailed: boolean,
): ProviderExecutionMode {
  if (!mock) return "live";
  if (sdkFailed) return "fallback";
  return "mock";
}
