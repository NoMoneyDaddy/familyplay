.PHONY: init dev preview-deploy ship rollback test logs stop \
        db\:reset db\:types db\:migrate audit check-secrets

# ─────────────────────────────────────────────────────────
# 開發
# ─────────────────────────────────────────────────────────

init:
	@echo "🚀 設定 FamilyPlay..."
	@command -v pnpm >/dev/null 2>&1 || (echo "❌ 需要 pnpm。請執行：npm install -g pnpm" && exit 1)
	@command -v docker >/dev/null 2>&1 || (echo "❌ 需要 Docker Desktop，請先啟動 Docker" && exit 1)
	pnpm install
	pnpm supabase start
	pnpm supabase db reset
	@cp -n .env.example .env.local && echo "✅ 已建立 .env.local，請填入你的設定值" || echo "ℹ️  .env.local 已存在，跳過"
	@echo ""
	@echo "✅ 完成！"
	@echo "   開發伺服器：http://localhost:3000"
	@echo "   Supabase 控制台：http://localhost:54323"
	@echo ""
	@echo "👉 下一步：make dev"

dev:
	pnpm turbo dev

# ─────────────────────────────────────────────────────────
# 部署
# ─────────────────────────────────────────────────────────

preview-deploy:
	@# 確認 .env.local 在 gitignore 中，防止意外 commit
	@git check-ignore .env.local > /dev/null 2>&1 || \
		(echo "❌ 危險：.env.local 未被 gitignore，中止部署" && exit 1)
	@# 只有已 staged 的變更才 commit
	@if [ -n "$$(git diff --cached --name-only)" ]; then \
		git commit -m "preview: $$(date '+%Y-%m-%d %H:%M')"; \
	elif [ -n "$$(git status --porcelain)" ]; then \
		echo "⚠️  有未 staged 的變更。請先執行：git add <檔案>"; \
		echo "   或執行：git add apps/ packages/ supabase/ && make preview-deploy"; \
		exit 1; \
	fi
	git push -u origin develop
	@echo "✅ 已推送至 develop，等待 Telegram 通知..."

ship:
	@# 推送 develop，然後引導開 PR → main
	@# main 有 Branch Protection，CI 通過才能合併，Zeabur 才部署正式版
	@echo "🚀 準備發布正式版..."
	@git check-ignore .env.local > /dev/null 2>&1 || \
		(echo "❌ 危險：.env.local 未被 gitignore，中止部署" && exit 1)
	git push -u origin develop
	@echo ""
	@echo "✅ develop 已推送"
	@echo ""
	@echo "👉 下一步：在 GitHub 建立 PR develop → main"
	@echo "   https://github.com/nomoneydaddy/familyplay/compare/main...develop"
	@echo ""
	@echo "   CI 通過後合併，Zeabur 自動部署正式版至台北節點"

rollback:
	@echo "⏪ 回滾上一版..."
	git revert HEAD --no-edit
	git push origin main
	@echo "✅ 回滾完成"

# ─────────────────────────────────────────────────────────
# 測試
# ─────────────────────────────────────────────────────────

test:
	pnpm turbo test

test\:e2e:
	pnpm turbo test:e2e

# ─────────────────────────────────────────────────────────
# 資料庫
# ─────────────────────────────────────────────────────────

db\:reset:
	pnpm supabase db reset

db\:types:
	pnpm supabase gen types typescript --local > packages/db/src/generated.ts
	@echo "✅ TypeScript types 已更新：packages/db/src/generated.ts"

db\:migrate:
	@read -p "Migration 名稱（英文，如 add_user_settings）：" name; \
	pnpm supabase migration new $$name

# ─────────────────────────────────────────────────────────
# 品質與安全
# ─────────────────────────────────────────────────────────

audit:
	pnpm audit
	npx depcheck --ignore-patterns="**/*.d.ts"

check-secrets:
	@echo "🔍 掃描是否有機密資料被意外 commit..."
	@git log --all --full-history -- "**/.env*" "**/*secret*" "**/*key*" | head -20 || true
	@grep -rn "sk-\|AIza\|ghp_\|ghs_" --include="*.ts" --include="*.tsx" --include="*.js" \
		--exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null && \
		echo "⚠️  可能有 API Key 硬寫在程式碼中！請檢查。" || \
		echo "✅ 未發現硬寫的 API Key"

lint:
	pnpm biome check .

format:
	pnpm biome format --write .

# ─────────────────────────────────────────────────────────
# 維護
# ─────────────────────────────────────────────────────────

logs:
	pnpm supabase logs

stop:
	pnpm supabase stop

clean:
	pnpm turbo clean
	find . -name "node_modules" -type d -not -path "*/.git/*" | xargs rm -rf
	@echo "✅ 清理完成，重新執行 make init"
