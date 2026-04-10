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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtArgs = { args: any; query: (args: any) => Promise<any> };

export function getTenantDb(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }: ExtArgs) {
          // findUnique kann nicht direkt tenantId in where injizieren (Prisma verlangt
          // unique fields). Stattdessen: Query ausfuehren und danach tenantId pruefen.
          const result = await query(args);
          if (result && "tenantId" in result && result.tenantId !== tenantId) {
            return null;
          }
          return result;
        },
        async create({ args, query }: ExtArgs) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
        async update({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async count({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async updateMany({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async deleteMany({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async aggregate({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async groupBy({ args, query }: ExtArgs) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}
