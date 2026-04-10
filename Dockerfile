# syntax=docker/dockerfile:1

# ---- Basis-Image ----
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# ---- Abhängigkeiten installieren ----
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client generieren
RUN pnpm prisma generate

# Next.js Standalone-Build (minimales Image, kein node_modules im runner nötig)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- Production Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Nicht-root-Benutzer anlegen (Sicherheit)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone-Output kopieren
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma-Schema + Migrations für migrate deploy zur Laufzeit
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
