# Backend Dockerfile (Production)
# Note: Build context is repo root, so paths include 'backend/'
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci

# Copy prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Production image
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install production deps only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

