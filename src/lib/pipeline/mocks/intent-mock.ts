import type { AppIntent } from "@/types/domain";
import { analyzePrompt } from "@/lib/pipeline/mocks/prompt-analysis";

export function buildMockIntent(prompt: string): AppIntent {
  const analysis = analyzePrompt(prompt);

  const assumptions: string[] = analysis.isVague
    ? [
        "Assumed multi-tenant SaaS deployment",
        "Assumed email/password authentication",
        "Assumed REST API backend",
      ]
    : [];

  const baseEntities =
    analysis.appType === "crm"
      ? [
          { name: "Contact", description: "People and organizations in the sales pipeline" },
          { name: "Deal", description: "Sales opportunities linked to contacts" },
          { name: "Account", description: "Companies or organizations" },
        ]
      : analysis.appType === "ecommerce"
        ? [
            { name: "Product", description: "Catalog items for sale" },
            { name: "Order", description: "Customer purchase records" },
            { name: "Customer", description: "Registered shoppers" },
          ]
        : [
            { name: "User", description: "Application users" },
            { name: "Resource", description: "Primary business resource" },
          ];

  const features =
    analysis.appType === "crm"
      ? ["Contact management", "Deal pipeline", "Activity tracking", "Reporting dashboard"]
      : analysis.appType === "ecommerce"
        ? ["Product catalog", "Shopping cart", "Checkout", "Order history"]
        : ["User management", "Core workflows", "Dashboard", "Settings"];

  const integrationsRequested: string[] = [];
  if (/\bslack\b/i.test(prompt)) integrationsRequested.push("slack");
  if (/\bstripe\b|payment/i.test(prompt)) integrationsRequested.push("stripe");
  if (/\bemail|gmail\b/i.test(prompt)) integrationsRequested.push("gmail");
  if (/\bjira\b/i.test(prompt)) integrationsRequested.push("jira");
  if (/\bwhatsapp|twilio\b/i.test(prompt)) integrationsRequested.push("whatsapp-twilio");

  return {
    appName: analysis.appName,
    appType: analysis.appType,
    summary: prompt.slice(0, 500) || "Application generated from user prompt",
    goals: features.map((f) => `Enable ${f.toLowerCase()}`),
    actors: ["Admin", "User"],
    constraints: analysis.isVague ? ["MVP scope", "Cloud-hosted"] : [],
    entities: baseEntities,
    integrationsRequested,
    assumptions,
    features,
    clarificationRequired: false,
  };
}
