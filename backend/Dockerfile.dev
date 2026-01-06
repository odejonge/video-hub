# Backend Dockerfile (Development)
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema for generation
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source (will be overwritten by volume in dev)
COPY . .

# Expose port
EXPOSE 3000

# Run with tsx watch for hot reload
CMD ["npx", "tsx", "watch", "src/index.ts"]

