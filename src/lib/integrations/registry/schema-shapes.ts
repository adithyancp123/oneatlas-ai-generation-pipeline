import type { PayloadShape } from "@/types/integrations";

const payload = (id: string) => `integration.${id}.payload.v1`;

export { payload };

export const SLACK_SCHEMAS = {
  triggers: {
    "message.posted": {
      inputSchema: { channelId: "string", teamId: "string" } satisfies PayloadShape,
      outputSchema: {
        messageId: "string",
        channelId: "string",
        userId: "string",
        text: "string",
        timestamp: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("slack.message.posted"),
    },
    "reaction.added": {
      inputSchema: { channelId: "string", messageId: "string" } satisfies PayloadShape,
      outputSchema: {
        reaction: "string",
        userId: "string",
        messageId: "string",
        channelId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("slack.reaction.added"),
    },
  },
  actions: {
    "message.send": {
      inputSchema: {
        channelId: "string",
        message: "string",
        metadata: "object",
      } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        messageId: "string",
        timestamp: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("slack.message.send"),
    },
    "channel.create": {
      inputSchema: { name: "string", isPrivate: "boolean" } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        channelId: "string",
        name: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("slack.channel.create"),
    },
  },
} as const;

export const WHATSAPP_SCHEMAS = {
  triggers: {
    "message.received": {
      inputSchema: { webhookUrl: "string" } satisfies PayloadShape,
      outputSchema: {
        from: "string",
        to: "string",
        body: "string",
        messageSid: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("whatsapp.message.received"),
    },
  },
  actions: {
    "message.send": {
      inputSchema: { to: "string", body: "string", mediaUrl: "string" } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        messageSid: "string",
        status: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("whatsapp.message.send"),
    },
  },
} as const;

export const GMAIL_SCHEMAS = {
  triggers: {
    "email.received": {
      inputSchema: { labelIds: "array", query: "string" } satisfies PayloadShape,
      outputSchema: {
        messageId: "string",
        threadId: "string",
        from: "string",
        subject: "string",
        snippet: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("gmail.email.received"),
    },
  },
  actions: {
    "email.send": {
      inputSchema: {
        to: "string",
        subject: "string",
        body: "string",
        cc: "array",
      } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        messageId: "string",
        threadId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("gmail.email.send"),
    },
  },
} as const;

export const STRIPE_SCHEMAS = {
  triggers: {
    "payment.succeeded": {
      inputSchema: { webhookSecret: "string" } satisfies PayloadShape,
      outputSchema: {
        paymentIntentId: "string",
        amount: "number",
        currency: "string",
        customerId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("stripe.payment.succeeded"),
    },
    "subscription.updated": {
      inputSchema: { webhookSecret: "string" } satisfies PayloadShape,
      outputSchema: {
        subscriptionId: "string",
        status: "string",
        customerId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("stripe.subscription.updated"),
    },
  },
  actions: {
    "payment.create": {
      inputSchema: {
        amount: "number",
        currency: "string",
        customerId: "string",
        metadata: "object",
      } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        paymentIntentId: "string",
        clientSecret: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("stripe.payment.create"),
    },
    "customer.create": {
      inputSchema: { email: "string", name: "string", metadata: "object" } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        customerId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("stripe.customer.create"),
    },
  },
} as const;

export const JIRA_SCHEMAS = {
  triggers: {
    "issue.created": {
      inputSchema: { projectKey: "string", jql: "string" } satisfies PayloadShape,
      outputSchema: {
        issueKey: "string",
        issueId: "string",
        summary: "string",
        status: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("jira.issue.created"),
    },
    "issue.updated": {
      inputSchema: { projectKey: "string", issueKey: "string" } satisfies PayloadShape,
      outputSchema: {
        issueKey: "string",
        issueId: "string",
        changelog: "object",
      } satisfies PayloadShape,
      payloadSchemaId: payload("jira.issue.updated"),
    },
  },
  actions: {
    "issue.create": {
      inputSchema: {
        projectKey: "string",
        summary: "string",
        description: "string",
        issueType: "string",
      } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        issueKey: "string",
        issueId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("jira.issue.create"),
    },
    "comment.add": {
      inputSchema: { issueKey: "string", body: "string" } satisfies PayloadShape,
      outputSchema: {
        success: "boolean",
        commentId: "string",
      } satisfies PayloadShape,
      payloadSchemaId: payload("jira.comment.add"),
    },
  },
} as const;
