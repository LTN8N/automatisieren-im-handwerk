import { PrismaClient } from "@prisma/client";

const SLOW_QUERY_THRESHOLD_MS = 500;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [{ emit: "event", level: "query" }, "warn", "error"]
        : ["warn", "error"],
  });

  // Slow query logging: Log queries that take longer than SLOW_QUERY_THRESHOLD_MS
  if (process.env.NODE_ENV === "development") {
    client.$on("query", (e) => {
      if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
        console.warn(
          `[SlowQuery] ${e.duration}ms — ${e.query.substring(0, 200)}`
        );
      }
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Erstellt einen Prisma Client mit automatischem Tenant-Filter.
 * Alle Queries werden automatisch auf den angegebenen Tenant gefiltert.
 */
export function getTenantDb(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }) {
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId } as typeof args.data;
          return query(args);
        },
        async update({ args, query }) {
          args.where = { ...args.where, tenantId } as typeof args.where;
          return query(args);
        },
        async delete({ args, query }) {
          args.where = { ...args.where, tenantId } as typeof args.where;
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}
