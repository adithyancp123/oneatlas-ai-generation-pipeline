import { Mistral } from "@mistralai/mistralai";
import type { SDKCallOptions, SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { mapSdkError } from "@/lib/ai/providers/sdk-errors";

export async function callMistralSDK(options: SDKCallOptions): Promise<SDKCallResult> {
  const client = new Mistral({ apiKey: options.apiKey });

  try {
    const response = await client.chat.complete({
      model: options.model,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 4096,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: options.prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content;
    const text = typeof content === "string" ? content : JSON.stringify(content ?? "");

    return {
      text,
      usage: {
        promptTokens: response.usage?.promptTokens ?? 0,
        completionTokens: response.usage?.completionTokens ?? 0,
        totalTokens: response.usage?.totalTokens ?? 0,
      },
    };
  } catch (error) {
    throw mapSdkError(error, "mistral");
  }
}
