import type { IntegrationDefinition } from "@/types/integrations";

const payload = (id: string) => `integration.${id}.payload.v1`;

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  {
    id: "slack",
    displayName: "Slack",
    description: "Team messaging and notifications",
    authType: "oauth2",
    requiredEnvKeys: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "SLACK_SIGNING_SECRET"],
    triggers: [
      {
        id: "message.posted",
        name: "Message Posted",
        description: "Fires when a message is posted to a channel",
        payloadSchemaId: payload("slack.message.posted"),
      },
      {
        id: "reaction.added",
        name: "Reaction Added",
        description: "Fires when a reaction is added to a message",
        payloadSchemaId: payload("slack.reaction.added"),
      },
    ],
    actions: [
      {
        id: "message.send",
        name: "Send Message",
        description: "Post a message to a Slack channel",
        payloadSchemaId: payload("slack.message.send"),
      },
      {
        id: "channel.create",
        name: "Create Channel",
        description: "Create a new Slack channel",
        payloadSchemaId: payload("slack.channel.create"),
      },
    ],
  },
  {
    id: "whatsapp-twilio",
    displayName: "WhatsApp (Twilio)",
    description: "WhatsApp messaging via Twilio",
    authType: "api_key",
    requiredEnvKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"],
    triggers: [
      {
        id: "message.received",
        name: "Message Received",
        description: "Inbound WhatsApp message",
        payloadSchemaId: payload("whatsapp.message.received"),
      },
    ],
    actions: [
      {
        id: "message.send",
        name: "Send Message",
        description: "Send an outbound WhatsApp message",
        payloadSchemaId: payload("whatsapp.message.send"),
      },
    ],
  },
  {
    id: "gmail",
    displayName: "Gmail / Google Workspace",
    description: "Email send and receive via Google APIs",
    authType: "oauth2",
    requiredEnvKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    triggers: [
      {
        id: "email.received",
        name: "Email Received",
        description: "New email in inbox",
        payloadSchemaId: payload("gmail.email.received"),
      },
    ],
    actions: [
      {
        id: "email.send",
        name: "Send Email",
        description: "Send an email message",
        payloadSchemaId: payload("gmail.email.send"),
      },
    ],
  },
  {
    id: "stripe",
    displayName: "Stripe",
    description: "Payment processing and billing events",
    authType: "api_key",
    requiredEnvKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    triggers: [
      {
        id: "payment.succeeded",
        name: "Payment Succeeded",
        description: "Payment completed successfully",
        payloadSchemaId: payload("stripe.payment.succeeded"),
      },
      {
        id: "subscription.updated",
        name: "Subscription Updated",
        description: "Subscription status changed",
        payloadSchemaId: payload("stripe.subscription.updated"),
      },
    ],
    actions: [
      {
        id: "payment.create",
        name: "Create Payment",
        description: "Create a payment intent",
        payloadSchemaId: payload("stripe.payment.create"),
      },
      {
        id: "customer.create",
        name: "Create Customer",
        description: "Create a Stripe customer",
        payloadSchemaId: payload("stripe.customer.create"),
      },
    ],
  },
  {
    id: "jira",
    displayName: "Jira",
    description: "Issue tracking and project management",
    authType: "api_key",
    requiredEnvKeys: ["JIRA_BASE_URL", "JIRA_API_TOKEN", "JIRA_EMAIL"],
    triggers: [
      {
        id: "issue.created",
        name: "Issue Created",
        description: "New Jira issue created",
        payloadSchemaId: payload("jira.issue.created"),
      },
      {
        id: "issue.updated",
        name: "Issue Updated",
        description: "Existing issue updated",
        payloadSchemaId: payload("jira.issue.updated"),
      },
    ],
    actions: [
      {
        id: "issue.create",
        name: "Create Issue",
        description: "Create a new Jira issue",
        payloadSchemaId: payload("jira.issue.create"),
      },
      {
        id: "comment.add",
        name: "Add Comment",
        description: "Add a comment to an issue",
        payloadSchemaId: payload("jira.comment.add"),
      },
    ],
  },
];

export function getIntegrationById(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_REGISTRY.find((entry) => entry.id === id);
}
