# Frontend Dockerfile (Development)
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source (will be overwritten by volume in dev)
COPY . .

# Expose Vite port
EXPOSE 5173

# Run Vite dev server with host access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

