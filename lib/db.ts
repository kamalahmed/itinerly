import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Cap how long Prisma will wait to establish a connection and to acquire a
 * pooled connection, so an unreachable database fails in seconds rather than
 * blocking the request indefinitely. Query-level hangs are handled separately
 * by `withTimeout` at the call sites.
 */
function urlWithTimeouts(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connect_timeout"))
      u.searchParams.set("connect_timeout", "10");
    if (!u.searchParams.has("pool_timeout"))
      u.searchParams.set("pool_timeout", "10");
    return u.toString();
  } catch {
    return url;
  }
}

const url = urlWithTimeouts(process.env.DATABASE_URL);

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
