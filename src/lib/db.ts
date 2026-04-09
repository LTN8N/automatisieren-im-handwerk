import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

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
