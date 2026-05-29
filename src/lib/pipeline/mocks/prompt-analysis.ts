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

  const isCrm =
    /\b(crm|customer|contact|lead|deal|pipeline|sales)\b/.test(lower);
  const isEcommerce =
    /\b(shop|store|ecommerce|e-commerce|product|cart|checkout|order)\b/.test(lower);
  const isMarketplace =
    /\b(marketplace|vendor|buyer|listing)\b/.test(lower);

  let appType: AppType = "saas";
  if (isCrm) appType = "crm";
  else if (isEcommerce) appType = "ecommerce";
  else if (isMarketplace) appType = "marketplace";

  const isVague = words.length < 6 && !isCrm && !isEcommerce;

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
    ecommerce: "Commerce Store",
    saas: "Business App",
    internal_tool: "Internal Tool",
    marketplace: "Marketplace Platform",
    other: "Application",
  };
  return defaults[appType];
}
