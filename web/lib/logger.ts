type LogLevel = "info" | "warn" | "error";

export function logEvent(
  level: LogLevel,
  event: string,
  meta?: Record<string, unknown>,
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export const logger = {
  info(event: string, meta?: Record<string, unknown>) {
    logEvent("info", event, meta);
  },
  warn(event: string, meta?: Record<string, unknown>) {
    logEvent("warn", event, meta);
  },
  error(event: string, meta?: Record<string, unknown>) {
    logEvent("error", event, meta);
  },
};
