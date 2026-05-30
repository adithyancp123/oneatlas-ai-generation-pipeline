import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_SDK_TIMEOUT_MS, type SDKCallOptions, type SDKCallResult } from "@/lib/ai/providers/sdk-types";
import { mapSdkError } from "@/lib/ai/providers/sdk-errors";

export async function callGeminiSDK(
  options: SDKCallOptions,
  providerId: "gemini" | "google-ai" = "gemini",
): Promise<SDKCallResult> {
  try {
    const genAI = new GoogleGenerativeAI(options.apiKey);
    const model = genAI.getGenerativeModel({
      model: options.model,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 4096,
        responseMimeType: "application/json",
      },
    });

    const prompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n${options.prompt}`
      : options.prompt;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_SDK_TIMEOUT_MS,
    );

    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    clearTimeout(timeout);

    const text = result.response.text();
    const usageMeta = result.response.usageMetadata;

    return {
      text,
      usage: {
        promptTokens: usageMeta?.promptTokenCount ?? 0,
        completionTokens: usageMeta?.candidatesTokenCount ?? 0,
        totalTokens: usageMeta?.totalTokenCount ?? 0,
      },
    };
  } catch (error) {
    throw mapSdkError(error, providerId);
  }
}
