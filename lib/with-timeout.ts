/**
 * Fast-fail wrapper for I/O that can hang.
 *
 * A database whose host is unreachable (e.g. a deleted/suspended Neon endpoint)
 * accepts the TCP connection but never completes the Postgres handshake, so a
 * naive `await prisma.query()` blocks until the serverless platform kills the
 * function ~tens of seconds later — the request appears to "hang". Racing the
 * query against a timer turns that into a quick, catchable rejection so the
 * caller can return a graceful response instead.
 */

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Per-request budget for DB-backed work, in milliseconds. Kept comfortably
 * under Vercel's serverless function limit so we can still send a response.
 * Override with DB_TIMEOUT_MS if needed.
 */
export const DB_TIMEOUT_MS = Number(process.env.DB_TIMEOUT_MS ?? 8000);
