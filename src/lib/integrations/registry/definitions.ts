import type { IntegrationDefinition } from "@/types/integrations";
import {
  GMAIL_SCHEMAS,
  JIRA_SCHEMAS,
  SLACK_SCHEMAS,
  STRIPE_SCHEMAS,
  WHATSAPP_SCHEMAS,
} from "@/lib/integrations/registry/schema-shapes";

function buildTriggers<T extends Record<string, { inputSchema: object; outputSchema: object; payloadSchemaId: string }>>(
  schemas: T,
  labels: Record<keyof T, { name: string; description: string }>,
): IntegrationDefinition["triggers"] {
  return (Object.keys(schemas) as (keyof T)[]).map((id) => {
    const shape = schemas[id];
    const meta = labels[id];
    if (!shape || !meta) {
      throw new Error(`Missing schema or label for trigger ${String(id)}`);
    }
    return {
      id: id as string,
      name: meta.name,
      description: meta.description,
      payloadSchemaId: shape.payloadSchemaId,
      inputSchema: { ...shape.inputSchema },
      outputSchema: { ...shape.outputSchema },
    };
  });
}

function buildActions<T extends Record<string, { inputSchema: object; outputSchema: object; payloadSchemaId: string }>>(
  schemas: T,
  labels: Record<keyof T, { name: string; description: string }>,
): IntegrationDefinition["actions"] {
  return (Object.keys(schemas) as (keyof T)[]).map((id) => {
    const shape = schemas[id];
    const meta = labels[id];
    if (!shape || !meta) {
      throw new Error(`Missing schema or label for trigger ${String(id)}`);
    }
    return {
      id: id as string,
      name: meta.name,
      description: meta.description,
      payloadSchemaId: shape.payloadSchemaId,
      inputSchema: { ...shape.inputSchema },
      outputSchema: { ...shape.outputSchema },
    };
  });
}

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  {
    id: "slack",
    displayName: "Slack",
    description: "Team messaging and notifications",
    authType: "oauth2",
    requiredEnvKeys: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET"],
    triggers: buildTriggers(SLACK_SCHEMAS.triggers, {
      "message.posted": {
        name: "Message Posted",
        description: "Fires when a message is posted to a channel",
      },
      "reaction.added": {
        name: "Reaction Added",
        description: "Fires when a reaction is added to a message",
      },
    }),
    actions: buildActions(SLACK_SCHEMAS.actions, {
      "message.send": {
        name: "Send Message",
        description: "Post a message to a Slack channel",
      },
      "channel.create": {
        name: "Create Channel",
        description: "Create a new Slack channel",
      },
    }),
  },
  {
    id: "whatsapp-twilio",
    displayName: "WhatsApp (Twilio)",
    description: "WhatsApp messaging via Twilio",
    authType: "api_key",
    requiredEnvKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"],
    triggers: buildTriggers(WHATSAPP_SCHEMAS.triggers, {
      "message.received": {
        name: "Message Received",
        description: "Inbound WhatsApp message",
      },
    }),
    actions: buildActions(WHATSAPP_SCHEMAS.actions, {
      "message.send": {
        name: "Send Message",
        description: "Send an outbound WhatsApp message",
      },
    }),
  },
  {
    id: "gmail",
    displayName: "Gmail / Google Workspace",
    description: "Email send and receive via Google APIs",
    authType: "oauth2",
    requiredEnvKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    triggers: buildTriggers(GMAIL_SCHEMAS.triggers, {
      "email.received": {
        name: "Email Received",
        description: "New email in inbox",
      },
    }),
    actions: buildActions(GMAIL_SCHEMAS.actions, {
      "email.send": {
        name: "Send Email",
        description: "Send an email message",
      },
    }),
  },
  {
    id: "stripe",
    displayName: "Stripe",
    description: "Payment processing and billing events",
    authType: "api_key",
    requiredEnvKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    triggers: buildTriggers(STRIPE_SCHEMAS.triggers, {
      "payment.succeeded": {
        name: "Payment Succeeded",
        description: "Payment completed successfully",
      },
      "subscription.updated": {
        name: "Subscription Updated",
        description: "Subscription status changed",
      },
    }),
    actions: buildActions(STRIPE_SCHEMAS.actions, {
      "payment.create": {
        name: "Create Payment",
        description: "Create a payment intent",
      },
      "customer.create": {
        name: "Create Customer",
        description: "Create a Stripe customer",
      },
    }),
  },
  {
    id: "jira",
    displayName: "Jira",
    description: "Issue tracking and project management",
    authType: "api_key",
    requiredEnvKeys: ["JIRA_BASE_URL", "JIRA_API_TOKEN", "JIRA_EMAIL"],
    triggers: buildTriggers(JIRA_SCHEMAS.triggers, {
      "issue.created": {
        name: "Issue Created",
        description: "New Jira issue created",
      },
      "issue.updated": {
        name: "Issue Updated",
        description: "Existing issue updated",
      },
    }),
    actions: buildActions(JIRA_SCHEMAS.actions, {
      "issue.create": {
        name: "Create Issue",
        description: "Create a new Jira issue",
      },
      "comment.add": {
        name: "Add Comment",
        description: "Add a comment to an issue",
      },
    }),
  },
];

export function getIntegrationById(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_REGISTRY.find((entry) => entry.id === id);
}

export function getIntegrationAction(
  integrationId: string,
  actionId: string,
): IntegrationDefinition["actions"][number] | undefined {
  return getIntegrationById(integrationId)?.actions.find((a) => a.id === actionId);
}

export function getIntegrationTrigger(
  integrationId: string,
  triggerId: string,
): IntegrationDefinition["triggers"][number] | undefined {
  return getIntegrationById(integrationId)?.triggers.find((t) => t.id === triggerId);
}
