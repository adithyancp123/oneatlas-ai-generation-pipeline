import { PROVIDER_DEFINITIONS } from "@/config/providers";
import { STAGE_ROUTING_CONFIG } from "@/config/routing";
import { getApiKeyValue, getEnvValue, hasGeminiApiKey } from "@/config/env";
import { getProviderAdapter } from "@/lib/ai/gateway/provider-factory";
import type { ProviderCapabilities, ProviderId } from "@/lib/ai/gateway/types";
import type { PipelineStageId } from "@/types/pipeline";

export const STAGE_DISPLAY_LABELS: Record<PipelineStageId, string> = {
  intentExtraction: "Intent Extraction",
  schemaGeneration: "Schema Generation",
  appSpecGeneration: "AppSpec Generation",
  repair: "Repair",
};

export interface ProviderKeyStatus {
  envKey: string;
  present: boolean;
}

export interface ProviderStatus {
  id: ProviderId;
  displayName: string;
  configured: boolean;
  apiKeyPresent: boolean;
  apiKeyEnvKeys: ProviderKeyStatus[];
  mockFallbackAvailable: true;
  defaultModel: string;
  configuredModel: string;
  capabilities: ProviderCapabilities;
  routingRoles: string[];
}

export interface RoutingStageSummary {
  stageId: PipelineStageId;
  stageLabel: string;
  primaryProvider: string;
  primaryProviderLabel: string;
  fallbackProvider: string;
  fallbackProviderLabel: string;
  strategy: string;
}

export interface ProvidersOverview {
  providers: ProviderStatus[];
  routing: RoutingStageSummary[];
  totalProviders: number;
  configuredCount: number;
}

function providerDisplayName(id: string): string {
  const def = PROVIDER_DEFINITIONS.find((p) => p.id === id);
  return def?.displayName ?? id;
}

function isProviderConfigured(id: ProviderId): boolean {
  if (id === "gemini") return hasGeminiApiKey();
  const def = PROVIDER_DEFINITIONS.find((p) => p.id === id);
  if (!def) return false;
  return def.apiKeyEnvKeys.some((key) => getApiKeyValue(key) !== undefined);
}

function resolveConfiguredModel(def: (typeof PROVIDER_DEFINITIONS)[number]): string {
  const fromEnv = getEnvValue(def.defaultModelEnv);
  return fromEnv && fromEnv.length > 0 ? fromEnv : def.defaultModel;
}

function buildRoutingRoles(providerId: ProviderId): string[] {
  const roles: string[] = [];

  for (const entry of STAGE_ROUTING_CONFIG) {
    const label = STAGE_DISPLAY_LABELS[entry.stageId];
    if (entry.primary.provider === providerId) {
      roles.push(`Primary for ${label}`);
    }
    if (entry.fallback.provider === providerId) {
      roles.push(`Fallback for ${label}`);
    }
  }

  if (providerId === "openrouter" && isProviderConfigured("openrouter")) {
    roles.push("Universal gateway fallback");
  }

  if (roles.length === 0) {
    roles.push("Available (not in active routing)");
  }

  return roles;
}

export function buildProvidersOverview(): ProvidersOverview {
  const providers: ProviderStatus[] = PROVIDER_DEFINITIONS.map((def) => {
    const adapter = getProviderAdapter(def.id);
    const configured = adapter.isConfigured();
    const apiKeyEnvKeys = def.apiKeyEnvKeys.map((envKey) => ({
      envKey,
      present: getApiKeyValue(envKey) !== undefined,
    }));

    return {
      id: def.id,
      displayName: def.displayName,
      configured,
      apiKeyPresent: apiKeyEnvKeys.some((k) => k.present),
      apiKeyEnvKeys,
      mockFallbackAvailable: true,
      defaultModel: def.defaultModel,
      configuredModel: resolveConfiguredModel(def),
      capabilities: def.capabilities,
      routingRoles: buildRoutingRoles(def.id),
    };
  });

  const routing: RoutingStageSummary[] = STAGE_ROUTING_CONFIG.map((entry) => ({
    stageId: entry.stageId,
    stageLabel: STAGE_DISPLAY_LABELS[entry.stageId],
    primaryProvider: entry.primary.provider,
    primaryProviderLabel: providerDisplayName(entry.primary.provider),
    fallbackProvider: entry.fallback.provider,
    fallbackProviderLabel: providerDisplayName(entry.fallback.provider),
    strategy: entry.strategy,
  }));

  return {
    providers,
    routing,
    totalProviders: providers.length,
    configuredCount: providers.filter((p) => p.configured).length,
  };
}
