# Multi-stage production container for 8Ball Studio monorepo
# Stage 1: Build shared and frontend assets
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install all workspace dependencies
RUN npm ci

# Copy source trees
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Build client distribution
RUN npm --prefix frontend run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copy workspace dependencies & backend runtime
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm ci --omit=dev

COPY shared/ ./shared/
COPY backend/ ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=@8ball/backend"]

