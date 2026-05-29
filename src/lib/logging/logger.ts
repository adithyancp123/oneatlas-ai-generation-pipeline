import { getEnv } from "@/config/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogContext {
  jobId?: string;
  stageId?: string;
  provider?: string;
  [key: string]: unknown;
}

function shouldLog(level: LogLevel): boolean {
  const configured = getEnv().LOG_LEVEL;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configured];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const payload = context ? ` ${JSON.stringify(context)}` : "";
  return `[${level.toUpperCase()}] ${message}${payload}`;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, context));
  },
  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) console.info(formatMessage("info", message, context));
  },
  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, context));
  },
  error(message: string, context?: LogContext): void {
    if (shouldLog("error")) console.error(formatMessage("error", message, context));
  },
};
