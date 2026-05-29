import type { TokenUsage } from "@/lib/ai/gateway/types";

export interface SDKCallResult {
  text: string;
  usage: TokenUsage;
}

export interface SDKCallOptions {
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  timeoutMs?: number;
}

export const DEFAULT_SDK_TIMEOUT_MS = 60_000;
