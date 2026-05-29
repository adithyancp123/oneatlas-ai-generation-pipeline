export interface EvaluationPrompt {
  id: string;
  category: "standard" | "edge";
  prompt: string;
  expectedIntegrations?: string[];
}

export const STANDARD_PROMPTS: EvaluationPrompt[] = [
  {
    id: "crm-real-estate",
    category: "standard",
    prompt: "Build a CRM for real estate agents to track listings, buyers, and deal pipeline stages.",
    expectedIntegrations: [],
  },
  {
    id: "task-slack",
    category: "standard",
    prompt: "Create a task manager that sends Slack notifications when tasks become overdue.",
    expectedIntegrations: ["slack"],
  },
  {
    id: "inventory-email",
    category: "standard",
    prompt: "Design an inventory system that emails managers when stock is low.",
    expectedIntegrations: ["gmail"],
  },
  {
    id: "hr-slack-approval",
    category: "standard",
    prompt: "Build an HR tool where leave requests trigger Slack approval workflows.",
    expectedIntegrations: ["slack"],
  },
  {
    id: "ecommerce-stripe-gmail",
    category: "standard",
    prompt: "Ecommerce store with Stripe payments and Gmail order confirmations.",
    expectedIntegrations: ["stripe", "gmail"],
  },
  {
    id: "events-whatsapp",
    category: "standard",
    prompt: "Event platform that sends WhatsApp reminders to attendees before events.",
    expectedIntegrations: ["whatsapp-twilio"],
  },
  {
    id: "project-jira-sheets",
    category: "standard",
    prompt: "Project tracker integrated with Jira issues and Google Sheets exports.",
    expectedIntegrations: ["jira"],
  },
];

export const EDGE_PROMPTS: EvaluationPrompt[] = [
  { id: "vague-an-app", category: "edge", prompt: "An app." },
  {
    id: "notion-doctors",
    category: "edge",
    prompt: "Build something like Notion for doctors.",
  },
  {
    id: "overscoped-marketplace",
    category: "edge",
    prompt:
      "A marketplace with auctions, crypto payments, AI recommendations, social feed, and vendor dashboards.",
  },
  {
    id: "crm-pm-invoice-conflict",
    category: "edge",
    prompt: "CRM + project management + invoicing in one tool with conflicting admin roles.",
  },
  {
    id: "smart-task-manager",
    category: "edge",
    prompt: "Smart task manager that learns user habits.",
  },
];

export const ALL_EVALUATION_PROMPTS = [...STANDARD_PROMPTS, ...EDGE_PROMPTS];
