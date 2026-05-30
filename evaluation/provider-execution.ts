import { applyRoutingExecution, formatProviderExecutionLabel } from "@/lib/ai/provider-execution";
import type { AIGatewayResponse } from "@/lib/ai/gateway/types";

function mockResponse(overrides: Partial<AIGatewayResponse<string>> = {}): AIGatewayResponse<string> {
  return {
    data: "{}",
    provider: "gemini",
    model: "gemini-1.5-flash",
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    estimatedCostUsd: 0,
    latencyMs: 120,
    mock: true,
    execution: {
      provider: "gemini",
      model: "gemini-1.5-flash",
      mode: "mock",
      fallbackReason: "API key not configured",
      latencyMs: 120,
    },
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const noKey = mockResponse();
  assert(noKey.execution?.mode === "mock", "expected mock mode without key");
  assert(
    formatProviderExecutionLabel(noKey.execution!) === "Gemini • mock",
    "label for mock mode",
  );

  const sdkFallback = mockResponse({
    execution: {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      mode: "fallback",
      fallbackReason: "SDK call failed: Connection error.",
      latencyMs: 1634,
    },
  });
  assert(sdkFallback.execution?.mode === "fallback", "expected fallback after SDK error");
  assert(sdkFallback.execution?.latencyMs === 1634, "latency preserved");

  const routed = applyRoutingExecution(
    {
      ...mockResponse({ provider: "openai" }),
      execution: {
        provider: "openai",
        model: "gpt-4o-mini",
        mode: "mock",
        latencyMs: 1,
      },
    },
    1,
    "groq",
  );
  assert(routed.mode === "fallback", "routed fallback provider with mock");
  assert(
    routed.fallbackReason?.includes("Routed to fallback provider") === true,
    "routed fallback reason present",
  );

  const live = mockResponse({
    mock: false,
    execution: {
      provider: "openai",
      model: "gpt-4o-mini",
      mode: "live",
      latencyMs: 50,
    },
  });
  const routedLive = applyRoutingExecution(live, 1, "groq");
  assert(routedLive.mode === "live", "live on fallback route when SDK succeeds");

  console.log("Provider execution checks passed");
}

main();
