# Multi-stage build for production
FROM node:18-slim AS base

# Install dependencies needed for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./
COPY .npmrc ./

# Set npm timeout and retry config
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

# Install dependencies using npm install (more tolerant than ci)
RUN npm install --prefer-offline --no-audit --no-fund || \
    npm install --no-audit --no-fund || \
    npm install --legacy-peer-deps --no-audit --no-fund
RUN npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client with correct binary targets (with retries)
RUN npx prisma generate || npx prisma generate || npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-slim AS production

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy built application from base stage
COPY --from=base --chown=nodejs:nodejs /app/dist ./dist
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nodejs:nodejs /app/package*.json ./
COPY --from=base --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["npm", "start"]