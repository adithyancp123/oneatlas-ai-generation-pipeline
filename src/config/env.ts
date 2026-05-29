import { loadEnvConfig } from "@next/env";
import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  value === "" || value === undefined ? undefined : value;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),

  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GROQ_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_AI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  DEEPSEEK_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENROUTER_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MISTRAL_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  OPENAI_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  ANTHROPIC_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  GROQ_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  GEMINI_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  MISTRAL_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENROUTER_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  DEEPSEEK_DEFAULT_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),

  INTENT_EXTRACTION_MODEL_OVERRIDE: z.preprocess(emptyToUndefined, z.string().optional()),
  SCHEMA_GENERATION_MODEL_OVERRIDE: z.preprocess(emptyToUndefined, z.string().optional()),
  APP_SPEC_GENERATION_MODEL_OVERRIDE: z.preprocess(emptyToUndefined, z.string().optional()),
  REPAIR_MODEL_OVERRIDE: z.preprocess(emptyToUndefined, z.string().optional()),

  PIPELINE_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  PIPELINE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  ENABLE_COST_TRACKING: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;
let envFilesBootstrapped = false;

/** Ensures .env.local / .env are merged into process.env (fixes dev hot-reload gaps). */
function ensureEnvFilesLoaded(): void {
  if (envFilesBootstrapped || typeof window !== "undefined") return;

  envFilesBootstrapped = true;
  const dev = process.env.NODE_ENV !== "production";
  loadEnvConfig(process.cwd(), dev);
  cachedEnv = null;
}

const PLACEHOLDER_MARKERS = [
  "PASTE_YOUR_KEY_HERE",
  "YOUR_API_KEY",
  "YOUR_KEY_HERE",
  "CHANGEME",
  "REPLACE_ME",
] as const;

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return PLACEHOLDER_MARKERS.some(
    (marker) => normalized === marker || normalized.startsWith(`${marker}=`),
  );
}

export function getEnv(): Env {
  ensureEnvFilesLoaded();
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    cachedEnv = parsed.data;
    return cachedEnv;
  }

  cachedEnv = envSchema.parse({});
  return cachedEnv;
}

export function getEnvValue(key: string): string | undefined {
  ensureEnvFilesLoaded();
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

/** Returns API key value, or undefined if missing or still a placeholder. */
export function getApiKeyValue(envKey: string): string | undefined {
  const value = getEnvValue(envKey);
  if (!value) return undefined;

  if (isPlaceholderValue(value)) {
    return undefined;
  }

  return value.trim();
}

export function hasApiKey(envKey: string): boolean {
  return getApiKeyValue(envKey) !== undefined;
}

/** Gemini accepts GEMINI_API_KEY or GOOGLE_AI_API_KEY (either must be non-placeholder). */
export function getGeminiApiKeyValue(): string | undefined {
  return getApiKeyValue("GEMINI_API_KEY") ?? getApiKeyValue("GOOGLE_AI_API_KEY");
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKeyValue() !== undefined;
}
