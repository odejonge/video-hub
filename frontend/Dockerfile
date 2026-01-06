# Frontend Dockerfile (Production)
# Note: Build context is repo root, so paths include 'frontend/'
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
COPY frontend/ .
RUN npm run build

# Production image - serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template for SPA routing
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Railway provides PORT env var, default to 80
ENV PORT=80

# Expose port (Railway will override)
EXPOSE 80

# Use envsubst to replace ${PORT} in nginx config, then start nginx
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

