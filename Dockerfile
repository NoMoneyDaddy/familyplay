FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# ── 安裝依賴 ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# 先複製 package.json 利用 Docker layer cache
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json         ./apps/web/
COPY packages/core/package.json    ./packages/core/
COPY packages/ai/package.json      ./packages/ai/
COPY packages/db/package.json      ./packages/db/
COPY packages/assessment/package.json    ./packages/assessment/
COPY packages/capabilities/package.json  ./packages/capabilities/

RUN pnpm install --frozen-lockfile

# ── 建置 ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules                  ./node_modules
COPY --from=deps /app/apps/web/node_modules         ./apps/web/node_modules
COPY --from=deps /app/packages/core/node_modules    ./packages/core/node_modules
COPY --from=deps /app/packages/ai/node_modules      ./packages/ai/node_modules
COPY --from=deps /app/packages/db/node_modules      ./packages/db/node_modules
COPY . .

RUN pnpm --filter @familyplay/web build

# ── 正式執行 ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone 輸出包含所有必要檔案
COPY --from=builder /app/apps/web/.next/standalone  ./
COPY --from=builder /app/apps/web/.next/static      ./apps/web/.next/static
COPY --from=builder /app/apps/web/public            ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone 的 server entry point
CMD ["node", "apps/web/server.js"]
