import {
  anthropicAdapter,
  deepseekAdapter,
  geminiAdapter,
  groqAdapter,
  mistralAdapter,
  openaiAdapter,
  openrouterAdapter,
} from "@/lib/ai/providers";
import { googleAiAdapter } from "@/lib/gateway/adapters/google-ai";
import type { ProviderAdapter, ProviderId } from "@/lib/ai/gateway/types";
import { ProviderRequestError } from "@/lib/ai/gateway/types";

const adapters: Record<ProviderId, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  gemini: geminiAdapter,
  "google-ai": googleAiAdapter,
  deepseek: deepseekAdapter,
  mistral: mistralAdapter,
  openrouter: openrouterAdapter,
};

/** Maps routing config provider strings (e.g. "google") to adapter ids */
const PROVIDER_ALIASES: Record<string, ProviderId> = {
  google: "gemini",
};

export function resolveProviderId(provider: string): ProviderId {
  const normalized = provider.toLowerCase();
  if (normalized in adapters) {
    return normalized as ProviderId;
  }
  const alias = PROVIDER_ALIASES[normalized];
  if (alias) return alias;
  throw new ProviderRequestError(`Unknown provider: ${provider}`, "openrouter", undefined, false);
}

export function getProviderAdapter(provider: string): ProviderAdapter {
  const id = resolveProviderId(provider);
  const adapter = adapters[id];
  if (!adapter) {
    throw new ProviderRequestError(`No adapter registered for: ${id}`, id, undefined, false);
  }
  return adapter;
}

export function getOpenRouterAdapter(): ProviderAdapter {
  return openrouterAdapter;
}

export function listConfiguredProviders(): ProviderId[] {
  return (Object.keys(adapters) as ProviderId[]).filter((id) => adapters[id].isConfigured());
}
