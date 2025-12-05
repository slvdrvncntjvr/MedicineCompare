# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy client package and install
COPY client/package*.json ./client/
RUN cd client && npm ci

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Production stage
FROM node:18-slim

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Rebuild better-sqlite3 for this platform
RUN npm rebuild better-sqlite3

# Copy built client from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Copy server files
COPY server ./server

# Create data directory
RUN mkdir -p data

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
