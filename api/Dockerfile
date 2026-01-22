# Build stage
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and Prisma schema first
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
# postinstall will run prisma generate which needs the schema
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and Prisma schema first
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (skip postinstall script)
RUN npm ci --only=production --ignore-scripts

# Install Prisma CLI for migrations (needed at runtime for migrate deploy)
RUN npm install prisma

# Generate Prisma client in production
RUN npx prisma generate

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3006

# Use entrypoint script to run migrations before starting
ENTRYPOINT ["./docker-entrypoint.sh"]
