FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLIENT_ENGINE_TYPE=library

# -------------------------------------------
# Builder Stage
# -------------------------------------------
FROM base AS builder

# Build-time env vars that Next.js inlines into the client bundle.
# NEXT_PUBLIC_* vars are inlined at build time; runtime secrets
# (DATABASE_URL, AUTH_SECRET, CRON_SECRET, etc.) are injected
# via environment variables at container start.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client (required before build — generated client is not committed)
RUN npx prisma generate

# Validate Prisma schema
RUN npx prisma validate

# Build Next.js application (output: standalone)
RUN NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    npm run build

# -------------------------------------------
# Production Runtime Stage
# -------------------------------------------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Prisma CLI globally (needed for runtime migrations)
RUN npm install -g prisma

# Create non-root user for security
RUN addgroup -g 1001 -S dukaanos && \
    adduser -u 1001 -S dukaanos -G dukaanos

# Copy standalone Next.js server (includes bundled node_modules)
COPY --from=builder --chown=dukaanos:dukaanos /app/.next/standalone ./
COPY --from=builder --chown=dukaanos:dukaanos /app/.next/static ./.next/static
COPY --from=builder --chown=dukaanos:dukaanos /app/public ./public

# Copy Prisma generated client, schema, config, and migrations (runtime dependencies)
COPY --from=builder --chown=dukaanos:dukaanos /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=dukaanos:dukaanos /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=dukaanos:dukaanos /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=dukaanos:dukaanos /app/prisma/migrations ./prisma/migrations

# Migration entrypoint: applies pending migrations before starting the server
COPY --chmod=755 docker-entrypoint.sh ./entrypoint.sh

USER dukaanos

# Health check probe against the liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r)=>{process.exit(r.statusCode===200?0:1)})" || exit 1

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
