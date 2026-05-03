/** HTTP statuses worth retrying for idempotent GETs or transient upstream issues. */
export const RETRYABLE_HTTP_STATUS = new Set([
  408, 425, 429, 500, 502, 503, 504,
]);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoffMs(attempt: number, baseMs = 150): number {
  return baseMs * attempt;
}
