import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),

  OPENAI_DEFAULT_MODEL: z.string().optional(),
  ANTHROPIC_DEFAULT_MODEL: z.string().optional(),
  GROQ_DEFAULT_MODEL: z.string().optional(),
  GEMINI_DEFAULT_MODEL: z.string().optional(),
  MISTRAL_DEFAULT_MODEL: z.string().optional(),
  OPENROUTER_DEFAULT_MODEL: z.string().optional(),
  DEEPSEEK_DEFAULT_MODEL: z.string().optional(),

  INTENT_EXTRACTION_MODEL_OVERRIDE: z.string().optional(),
  SCHEMA_GENERATION_MODEL_OVERRIDE: z.string().optional(),
  APP_SPEC_GENERATION_MODEL_OVERRIDE: z.string().optional(),
  REPAIR_MODEL_OVERRIDE: z.string().optional(),

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

export function getEnv(): Env {
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
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}
