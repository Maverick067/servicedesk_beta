# Multi-stage build for Next.js application
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/package.json ./package.json

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:3000/api/health").then(r => r.ok ? process.exit(0) : process.exit(1))'

CMD ["bun", "run", ".next/standalone/server.js"]

