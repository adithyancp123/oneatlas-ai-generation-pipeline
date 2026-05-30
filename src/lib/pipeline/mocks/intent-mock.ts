import type { AppIntent, AppType, ExtractedEntity } from "@/types/domain";
import { enrichIntentWithPromptInsights } from "@/lib/pipeline/prompt-insights";
import { analyzePrompt } from "@/lib/pipeline/mocks/prompt-analysis";

function entitiesForAppType(appType: AppType): ExtractedEntity[] {
  switch (appType) {
    case "crm":
      return [
        { name: "Contact", description: "People and organizations in the sales pipeline" },
        { name: "Deal", description: "Sales opportunities linked to contacts" },
        { name: "Account", description: "Companies or organizations" },
      ];
    case "project_management":
      return [
        { name: "Task", description: "Work items and assignments" },
        { name: "User", description: "Team members who own tasks" },
      ];
    case "ecommerce":
      return [
        { name: "Product", description: "Catalog items for sale" },
        { name: "Order", description: "Customer purchase records" },
        { name: "Customer", description: "Registered shoppers" },
      ];
    case "hr_tool":
      return [
        { name: "Employee", description: "Company staff records" },
        { name: "Leave", description: "Time-off requests and balances" },
      ];
    case "inventory":
      return [
        { name: "Product", description: "Stock keeping units" },
        { name: "Warehouse", description: "Storage locations" },
        { name: "Supplier", description: "Vendors and supply partners" },
      ];
    case "content_platform":
      return [
        { name: "Article", description: "Published content pieces" },
        { name: "Author", description: "Content creators" },
      ];
    case "analytics":
      return [
        { name: "Report", description: "Saved analytical reports" },
        { name: "Metric", description: "Tracked KPIs and measurements" },
      ];
    default:
      return [
        { name: "User", description: "Application users" },
        { name: "Resource", description: "Primary business resource" },
      ];
  }
}

function featuresForAppType(appType: AppType): string[] {
  switch (appType) {
    case "crm":
      return ["Contact management", "Deal pipeline", "Activity tracking", "Reporting dashboard"];
    case "project_management":
      return ["Task boards", "Sprint planning", "Team assignments", "Progress tracking"];
    case "ecommerce":
      return ["Product catalog", "Shopping cart", "Checkout", "Order history"];
    case "hr_tool":
      return ["Employee directory", "Leave management", "Payroll hooks", "Performance reviews"];
    case "inventory":
      return ["Stock levels", "Warehouse management", "Supplier tracking", "Reorder alerts"];
    case "content_platform":
      return ["Article editor", "Publishing workflow", "Author management", "CMS pages"];
    case "analytics":
      return ["Dashboards", "Custom reports", "Metrics tracking", "Data export"];
    default:
      return ["User management", "Core workflows", "Dashboard", "Settings"];
  }
}

export function buildMockIntent(prompt: string): AppIntent {
  const analysis = analyzePrompt(prompt);
  const appType = analysis.appType;
  const features = featuresForAppType(appType);

  const baseIntent: AppIntent = {
    appName: analysis.appName,
    appType,
    summary: prompt.slice(0, 500) || "Application generated from user prompt",
    goals: features.map((f) => `Enable ${f.toLowerCase()}`),
    actors: ["Admin", "User"],
    constraints: analysis.isVague ? ["MVP scope", "Cloud-hosted"] : [],
    entities: entitiesForAppType(appType),
    integrationsRequested: [],
    assumptions: [],
    warnings: [],
    features,
    clarificationRequired: false,
  };

  return enrichIntentWithPromptInsights(prompt, baseIntent);
}
