import OpenAI from "openai";
import { DEFAULT_SDK_TIMEOUT_MS, type SDKCallOptions, type SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { mapSdkError } from "@/lib/ai/providers/sdk-errors";
import type { ProviderId } from "@/lib/ai/gateway/types";

export async function callOpenAICompatible(
  provider: ProviderId,
  options: SDKCallOptions,
): Promise<SDKCallResult> {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl,
    timeout: options.timeoutMs ?? DEFAULT_SDK_TIMEOUT_MS,
  });

  try {
    const response = await client.chat.completions.create({
      model: options.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4096,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: options.prompt },
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;

    return {
      text,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    throw mapSdkError(error, provider);
  }
}
