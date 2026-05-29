import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_SDK_TIMEOUT_MS, type SDKCallOptions, type SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { mapSdkError } from "@/lib/ai/providers/sdk-errors";

export async function callAnthropicSDK(options: SDKCallOptions): Promise<SDKCallResult> {
  const client = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? DEFAULT_SDK_TIMEOUT_MS,
  });

  try {
    const response = await client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.2,
      system: options.systemPrompt ?? "Respond with valid JSON only.",
      messages: [{ role: "user", content: options.prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return {
      text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    throw mapSdkError(error, "anthropic");
  }
}
