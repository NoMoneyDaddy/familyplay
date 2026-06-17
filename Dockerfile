FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Node 20 ships an older corepack whose signature check rejects pnpm 9
# ("Cannot find matching keyid"), which breaks the Zeabur build. Update corepack
# first so `prepare pnpm@9.15.0` verifies correctly.
RUN npm install -g corepack@latest \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# ── 安裝依賴 ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# 先複製 package.json + lockfile 利用 Docker layer cache
# pnpm-lock.yaml 必須存在，--frozen-lockfile 才能運作
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
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

COPY --from=deps /app/node_modules                       ./node_modules
COPY --from=deps /app/apps/web/node_modules              ./apps/web/node_modules
COPY --from=deps /app/packages/core/node_modules         ./packages/core/node_modules
COPY --from=deps /app/packages/ai/node_modules           ./packages/ai/node_modules
COPY --from=deps /app/packages/db/node_modules           ./packages/db/node_modules
# assessment + capabilities：目前 web 未直接 import，但複製可避免日後 import 時
# 本地建置成功而 Docker 建置失敗的隱性錯誤
COPY --from=deps /app/packages/assessment/node_modules   ./packages/assessment/node_modules
COPY --from=deps /app/packages/capabilities/node_modules ./packages/capabilities/node_modules
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
