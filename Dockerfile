FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Node 20 ships an older corepack whose signature check rejects pnpm 9
# ("Cannot find matching keyid"), which breaks the Zeabur build. Update corepack
# first so `prepare pnpm@9.15.0` verifies correctly.
RUN npm install -g corepack@latest \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# ── 建置（安裝 + 建置同一階段）────────────────────────────
# 注意：不要把 deps 階段的 node_modules 用 COPY --from 跨階段搬到 builder。
# pnpm 在每個 workspace 套件下產生的是「symlink 版」node_modules（指向根目錄
# .pnpm 虛擬商店）。BuildKit 跨階段 COPY 這些 symlink 目錄時，會因為
# 「failed to calculate checksum ... /app/packages/core/node_modules: not found」
# 而整個 build 失敗（Zeabur 線上所有部署都因此 FAILED）。
# 解法：直接在 builder 階段安裝，node_modules 從不跨階段複製。
# 仍保留「先複製 package.json + lockfile 再安裝」的 layer cache 優化。
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 先複製 package.json + lockfile 利用 Docker layer cache
# pnpm-lock.yaml 必須存在，--frozen-lockfile 才能運作
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json         ./apps/web/
COPY packages/core/package.json    ./packages/core/
COPY packages/ai/package.json      ./packages/ai/
COPY packages/data/package.json    ./packages/data/
COPY packages/db/package.json      ./packages/db/
COPY packages/assessment/package.json    ./packages/assessment/
COPY packages/capabilities/package.json  ./packages/capabilities/

# --prod=false：強制安裝 devDependencies。
# Zeabur build 環境帶有 NODE_ENV=production，pnpm 會因此略過 devDependencies；
# 但 next build 需要 typescript（載入 next.config.ts + 型別檢查）、tailwindcss、
# @types/* 等 devDeps，缺了會出現
#   "Installing TypeScript as it was not found while loading next.config.ts" → build 失敗。
# 用命令列旗標確保 devDeps 一定安裝（旗標優先於 env 變數）。
RUN pnpm install --frozen-lockfile --prod=false

# 再複製原始碼並建置（node_modules 已在本階段就位，無跨階段 COPY）
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
