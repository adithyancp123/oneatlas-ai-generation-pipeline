import { detectAppTypeFromPrompt } from "@/lib/pipeline/intent/app-type-detection";
import type { AppType } from "@/types/domain";

export interface PromptAnalysis {
  appType: AppType;
  appName: string;
  isVague: boolean;
  keywords: string[];
}

export function analyzePrompt(prompt: string): PromptAnalysis {
  const lower = prompt.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(Boolean);
  const appType = detectAppTypeFromPrompt(prompt);

  const hasDomainSignal = appType !== "custom";
  const isVague = words.length < 6 && !hasDomainSignal;

  const appName = extractAppName(prompt, appType);

  return {
    appType,
    appName,
    isVague,
    keywords: words.slice(0, 12),
  };
}

function extractAppName(prompt: string, appType: AppType): string {
  const match = prompt.match(/(?:called|named|build)\s+["']?([A-Za-z0-9\s]+?)["']?(?:\s+that|\.|,|$)/i);
  if (match?.[1]) return match[1].trim().slice(0, 48);

  const defaults: Record<AppType, string> = {
    crm: "Sales CRM",
    project_management: "Project Hub",
    ecommerce: "Commerce Store",
    hr_tool: "HR Suite",
    inventory: "Inventory System",
    content_platform: "Content Platform",
    analytics: "Analytics Dashboard",
    custom: "Business App",
  };
  return defaults[appType];
}
