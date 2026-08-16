import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when Prisma schema models/fields change so dev HMR drops the stale client. */
const PRISMA_CLIENT_VERSION = 4;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: number | undefined;
  pgPool: Pool | undefined;
};

/**
 * Build a pg Pool that works with Supabase pooler on networks that
 * inject/alter TLS certificates. `sslmode=require` in the URL forces
 * verify-full in recent `pg` versions and must be stripped.
 */
function createPool(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");

  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = globalForPrisma.pgPool ?? createPool(connectionString);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaVersion === PRISMA_CLIENT_VERSION
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = PRISMA_CLIENT_VERSION;
}
