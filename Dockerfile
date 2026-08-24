# Stage 1: Install dependencies and build Next.js app
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies if any native bindings need compilation
RUN apk add --no-cache libc6-compat python3 make g++

# Copy packages config files
COPY package*.json ./

# Clean install packages
RUN npm ci

# Copy project source files
COPY . .

# Generate Prisma Client targets
RUN npx prisma generate

# Build Next.js production files
RUN npm run build

# Stage 2: Runtime Environment
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# Start Next.js dev production server
CMD ["npm", "run", "start"]
