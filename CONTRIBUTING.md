# Contributing

感谢关注 Knowledge Studio。这是一个面向学习者的开源项目，欢迎 Issue、文档改进和小功能 PR。

## 开发环境

- Node.js 22（见 `.nvmrc`）
- pnpm 9
- Docker（用于本地 PostgreSQL）

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:setup
pnpm dev
```

浏览器打开 [http://localhost:3000/notes](http://localhost:3000/notes)。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 本地开发 |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm lint` | ESLint |
| `pnpm build` | 全栈构建（standalone） |
| `pnpm build:pages` | GitHub Pages 静态导出 |
| `pnpm db:setup` | 推送 schema 并 seed |

CI 会在 push / PR 时自动跑 typecheck、lint、db setup、build。

## 提交规范

- 一个 PR 聚焦一件事（修 bug、补文档、加能力等）
- 不要提交 `.env` 或含密钥的文件
- commit message 用中文或英文均可，写清「为什么」

## 推荐阅读顺序

1. `src/lib/notes-service.ts` — 笔记读写与静态导出分支
2. `src/lib/note-search.ts` / `src/lib/pg-trgm.ts` — 检索与 pg_trgm
3. `src/app/api/chat/route.ts` — 笔记召回 + 流式对话
4. `src/lib/admin-auth.ts` — 管理员鉴权
5. `scripts/build-pages.mjs` — Pages 静态构建（临时移走 API 路由）

## 报告问题

- Bug：附上复现步骤、期望与实际行为、环境（Node 版本、是否启用 Ollama / PostgreSQL）
- 功能建议：说明学习场景与预期收益
