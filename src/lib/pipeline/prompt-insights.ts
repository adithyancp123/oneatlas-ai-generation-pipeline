import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import { analyzePrompt } from "@/lib/pipeline/mocks/prompt-analysis";
import type { AmbiguityLevel, AppIntent, AppType } from "@/types/domain";

export interface PromptConfidenceMetadata {
  confidence: number;
  ambiguityLevel: AmbiguityLevel;
  clarificationReason?: string | undefined;
}

export interface DomainPrioritizationMetadata {
  detectedDomains: string[];
  prioritizedDomain?: string | undefined;
  prioritizationReason?: string | undefined;
}

export interface IntegrationResolutionMetadata {
  requestedIntegrations: string[];
  supportedIntegrations: string[];
  skippedIntegrations: { integration: string; reason: string }[];
}

/** Domains we score for conflict detection (stable string ids for reviewers). */
type ScoredDomainId = "crm" | "ecommerce" | "erp" | "blockchain" | "marketplace";

interface DomainScore {
  id: ScoredDomainId;
  score: number;
}

const APP_TYPE_LABELS: Record<AppType, string> = {
  crm: "CRM",
  ecommerce: "ecommerce",
  saas: "SaaS",
  internal_tool: "internal tool",
  marketplace: "marketplace",
  other: "general application",
};

const DOMAIN_DISPLAY: Record<ScoredDomainId, string> = {
  crm: "CRM",
  ecommerce: "ecommerce",
  erp: "ERP",
  blockchain: "blockchain",
  marketplace: "marketplace",
};

/**
 * Keyword weights per domain — higher score wins when multiple domains match.
 * Tie-break (equal scores): earlier entry in MVP_TIE_BREAK_ORDER (simpler MVP-first domain).
 */
const DOMAIN_KEYWORD_RULES: Record<ScoredDomainId, RegExp[]> = {
  crm: [
    /\bcrm\b/i,
    /\b(lead|leads|deal|deals|contact|contacts|pipeline|sales)\b/i,
  ],
  ecommerce: [
    /\b(ecommerce|e-commerce|shop|store)\b/i,
    /\b(product|products|cart|checkout|payment|payments|inventory)\b/i,
  ],
  erp: [
    /\b(erp|school|education|student|students|staff|university)\b/i,
    /\b(finance|financial|operations|payroll|invoic)\b/i,
  ],
  blockchain: [/\b(blockchain|crypto|voting|vote|wallet|chain|token|nft|web3)\b/i],
  marketplace: [/\b(marketplace|vendor|buyer|listing|auction)\b/i],
};

/** Deterministic tie-break: prefer simpler MVP-friendly domains when scores tie. */
const MVP_TIE_BREAK_ORDER: ScoredDomainId[] = [
  "crm",
  "ecommerce",
  "erp",
  "marketplace",
  "blockchain",
];

const UNSUPPORTED_INTEGRATIONS: { id: string; label: string; pattern: RegExp }[] = [
  { id: "telegram", label: "Telegram", pattern: /\btelegram\b/i },
  { id: "discord", label: "Discord", pattern: /\bdiscord\b/i },
  { id: "sap", label: "SAP", pattern: /\bsap\b/i },
  { id: "hubspot", label: "HubSpot", pattern: /\bhubspot\b/i },
  { id: "zendesk", label: "Zendesk", pattern: /\bzendesk\b/i },
];

const OVERSCOPE_PATTERN =
  /\b(auction|crypto|ai\b|machine learning|social feed|blockchain|voting|recommendation|learns user habits)\b/i;

const REGISTRY_IDS = new Set(INTEGRATION_REGISTRY.map((i) => i.id));

/**
 * Fixed scan order — registry connectors first (registry definition order), then aliases,
 * then known unsupported providers. Deterministic: same prompt → same resolution.
 */
const INTEGRATION_PROMPT_DETECTORS: { id: string; pattern: RegExp }[] = [
  ...INTEGRATION_REGISTRY.map((entry) => ({
    id: entry.id,
    pattern: new RegExp(`\\b${entry.id.replace(/-/g, "[-_]?")}\\b`, "i"),
  })),
  { id: "gmail", pattern: /\b(email|gmail)\b/i },
  { id: "stripe", pattern: /\b(stripe|payments?)\b/i },
  ...UNSUPPORTED_INTEGRATIONS.map((entry) => ({ id: entry.id, pattern: entry.pattern })),
];

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items)];
}

function countPatternHits(prompt: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  return [...prompt.matchAll(re)].length;
}

const EXPLICIT_DOMAIN_MENTION: Record<ScoredDomainId, RegExp> = {
  crm: /\bcrm\b/i,
  ecommerce: /\be-?commerce\b/i,
  erp: /\berp\b/i,
  blockchain: /\bblockchain\b/i,
  marketplace: /\bmarketplace\b/i,
};

/** Score each domain from keyword hits — fully deterministic, no randomness. */
function scoreDomains(prompt: string): DomainScore[] {
  return (Object.keys(DOMAIN_KEYWORD_RULES) as ScoredDomainId[]).map((id) => {
    let score = 0;
    if (EXPLICIT_DOMAIN_MENTION[id].test(prompt)) {
      score += 5;
    }
    for (const pattern of DOMAIN_KEYWORD_RULES[id]) {
      const hits = countPatternHits(prompt, pattern);
      if (hits > 0) score += hits * 2;
    }
    return { id, score };
  });
}

/**
 * When multiple domains match, pick the highest score.
 * Tie-break: MVP_TIE_BREAK_ORDER (CRM before ecommerce before ERP, etc.).
 */
export function computeDomainPrioritization(prompt: string): DomainPrioritizationMetadata {
  const scored = scoreDomains(prompt);
  const active = scored.filter((entry) => entry.score > 0);
  const detectedDomains = active.map((entry) => entry.id);

  if (active.length <= 1) {
    return { detectedDomains };
  }

  const explicitActive = active.filter((entry) => EXPLICIT_DOMAIN_MENTION[entry.id].test(prompt));

  // Multiple explicit domain names (e.g. "CRM + ecommerce + ERP") → MVP tie-break only.
  const ranked =
    explicitActive.length >= 2
      ? [...explicitActive].sort(
          (a, b) => MVP_TIE_BREAK_ORDER.indexOf(a.id) - MVP_TIE_BREAK_ORDER.indexOf(b.id),
        )
      : [...active].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return MVP_TIE_BREAK_ORDER.indexOf(a.id) - MVP_TIE_BREAK_ORDER.indexOf(b.id);
        });

  const winner = ranked[0]!;
  const prioritizedDomain = winner.id;
  const display = DOMAIN_DISPLAY[prioritizedDomain];

  return {
    detectedDomains,
    prioritizedDomain,
    prioritizationReason: `${display} selected as dominant MVP domain based on strongest business-object keyword match and reduced-scope generation`,
  };
}

/** Registry-driven resolution — no invented providers. */
export function computeIntegrationResolution(prompt: string): IntegrationResolutionMetadata {
  const requestedIntegrations: string[] = [];

  for (const detector of INTEGRATION_PROMPT_DETECTORS) {
    if (detector.pattern.test(prompt)) {
      requestedIntegrations.push(detector.id);
    }
  }

  const uniqueRequested = uniqueStrings(requestedIntegrations);
  const supportedIntegrations = uniqueRequested.filter((id) => REGISTRY_IDS.has(id));
  const skippedIntegrations = uniqueRequested
    .filter((id) => !REGISTRY_IDS.has(id))
    .map((integration) => ({
      integration,
      reason: "Unsupported integration",
    }));

  return {
    requestedIntegrations: uniqueRequested,
    supportedIntegrations,
    skippedIntegrations,
  };
}

function isOverscopedPrompt(prompt: string, domainCount: number): boolean {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  return (
    domainCount >= 3 ||
    (domainCount >= 2 && words.length >= 10) ||
    OVERSCOPE_PATTERN.test(prompt)
  );
}

function buildTransparencyMessages(
  prompt: string,
  appType: AppType,
  prioritization: DomainPrioritizationMetadata,
  integrationResolution: IntegrationResolutionMetadata,
): { assumptions: string[]; warnings: string[] } {
  const analysis = analyzePrompt(prompt);
  const assumptions: string[] = [];
  const warnings: string[] = [];

  const hasConflict = prioritization.detectedDomains.length >= 2;
  const prioritizedLabel =
    prioritization.prioritizedDomain !== undefined
      ? DOMAIN_DISPLAY[prioritization.prioritizedDomain as ScoredDomainId] ??
        APP_TYPE_LABELS[appType]
      : APP_TYPE_LABELS[appType];
  const unsupported = integrationResolution.skippedIntegrations;

  if (analysis.isVague) {
    assumptions.push(
      "Assumed multi-tenant SaaS deployment",
      "Assumed email/password authentication",
      "Assumed REST API backend",
    );
  }

  if (hasConflict) {
    const domainList = prioritization.detectedDomains
      .map((id) => DOMAIN_DISPLAY[id as ScoredDomainId] ?? id)
      .join(", ");
    assumptions.push(
      `Scope narrowed to ${prioritizedLabel} MVP for coherent first-pass generation`,
      `Conflicting domains detected (${domainList}); prioritized ${prioritizedLabel} semantics`,
    );
    warnings.push(
      `Multiple application domains detected (${domainList}); output reflects ${prioritizedLabel} scope only`,
    );
  }

  if (isOverscopedPrompt(prompt, prioritization.detectedDomains.length)) {
    assumptions.push("Large scope detected; generated MVP-first architecture");
    if (!warnings.some((w) => w.includes("MVP-first"))) {
      warnings.push("Prompt scope is broad; MVP-first architecture applied");
    }
  }

  for (const item of unsupported) {
    const label =
      UNSUPPORTED_INTEGRATIONS.find((u) => u.id === item.integration)?.label ?? item.integration;
    warnings.push(`Unsupported integration requested: ${label}`);
  }

  if (unsupported.length > 0) {
    assumptions.push(
      "Skipped unsupported integrations and preserved supported registry only",
    );
  }

  return { assumptions, warnings };
}

/** Deterministic confidence / ambiguity scoring (no ML). */
export function computePromptConfidence(
  prompt: string,
  appType: AppType,
  prioritization: DomainPrioritizationMetadata,
): PromptConfidenceMetadata {
  const analysis = analyzePrompt(prompt);
  const integrationResolution = computeIntegrationResolution(prompt);
  const overscoped = isOverscopedPrompt(prompt, prioritization.detectedDomains.length);
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const hasClearDomain =
    prioritization.detectedDomains.length === 1 &&
    wordCount >= 4 &&
    !analysis.isVague &&
    !overscoped;

  let score = hasClearDomain ? 0.9 : 0.82;
  let ambiguityLevel: AmbiguityLevel = "low";
  const reasons: string[] = [];

  if (analysis.isVague) {
    score = 0.45;
    ambiguityLevel = "high";
    reasons.push("Prompt is vague; assumptions applied for MVP generation");
  }

  if (prioritization.detectedDomains.length >= 2) {
    score = Math.min(score, 0.68);
    if (ambiguityLevel !== "high") ambiguityLevel = "medium";
    const label =
      prioritization.prioritizedDomain !== undefined
        ? DOMAIN_DISPLAY[prioritization.prioritizedDomain as ScoredDomainId]
        : APP_TYPE_LABELS[appType];
    reasons.push(`Conflicting domains detected; scope narrowed to ${label} for first-pass output`);
  }

  if (overscoped) {
    score = Math.min(score, 0.72);
    if (ambiguityLevel === "low") ambiguityLevel = "medium";
    reasons.push("Broad scope detected; MVP-first architecture applied");
  }

  if (integrationResolution.skippedIntegrations.length > 0) {
    score = Math.max(0.4, score - 0.07 * integrationResolution.skippedIntegrations.length);
    if (ambiguityLevel === "low") ambiguityLevel = "medium";
    reasons.push("Unsupported integrations requested; registry-only output preserved");
  }

  if (reasons.length === 0 && ambiguityLevel === "low") {
    score = Math.max(score, hasClearDomain ? 0.92 : 0.88);
  }

  const confidence = Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
  const clarificationReason =
    reasons.length > 0 ? reasons.slice(0, 2).join(". ") : undefined;

  return {
    confidence,
    ambiguityLevel,
    ...(clarificationReason ? { clarificationReason } : {}),
  };
}

/** Enrich intent with reviewer-visible assumptions and warnings (mock + live paths). */
export function enrichIntentWithPromptInsights(prompt: string, intent: AppIntent): AppIntent {
  const prioritization = computeDomainPrioritization(prompt);
  const integrationResolution = computeIntegrationResolution(prompt);
  const { assumptions: derivedAssumptions, warnings: derivedWarnings } =
    buildTransparencyMessages(prompt, intent.appType, prioritization, integrationResolution);

  const integrationsRequested = uniqueStrings([
    ...intent.integrationsRequested.filter((id) => REGISTRY_IDS.has(id)),
    ...integrationResolution.supportedIntegrations,
  ]);
  const confidenceMeta = computePromptConfidence(prompt, intent.appType, prioritization);

  return {
    ...intent,
    integrationsRequested,
    assumptions: uniqueStrings([...intent.assumptions, ...derivedAssumptions]),
    warnings: uniqueStrings([...(intent.warnings ?? []), ...derivedWarnings]),
    confidence: confidenceMeta.confidence,
    ambiguityLevel: confidenceMeta.ambiguityLevel,
    ...(confidenceMeta.clarificationReason
      ? { clarificationReason: confidenceMeta.clarificationReason }
      : {}),
    detectedDomains: prioritization.detectedDomains,
    ...(prioritization.prioritizedDomain
      ? { prioritizedDomain: prioritization.prioritizedDomain }
      : {}),
    ...(prioritization.prioritizationReason
      ? { prioritizationReason: prioritization.prioritizationReason }
      : {}),
    ...(integrationResolution.requestedIntegrations.length > 0
      ? {
          requestedIntegrations: integrationResolution.requestedIntegrations,
          supportedIntegrations: integrationResolution.supportedIntegrations,
          skippedIntegrations: integrationResolution.skippedIntegrations,
        }
      : {}),
  };
}
