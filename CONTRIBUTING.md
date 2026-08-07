# Contributing

感谢关注 Knowledge Studio。这是一个面向学习者的开源项目，欢迎 Issue、文档改进和小功能 PR。

## 开发环境

- Node.js 22（见 `.nvmrc`）
- pnpm 9
- Docker CLI + 容器引擎（macOS 推荐免费 [Colima](docs/setup-colima-macos.md)，勿依赖 Docker Desktop）

```bash
# macOS 若还在用 Docker Desktop：
bash scripts/setup-colima.sh

pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:setup
pnpm dev
```

浏览器打开 [http://localhost:3000/knowledge](http://localhost:3000/knowledge)。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 本地开发 |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm lint` | ESLint |
| `pnpm build` | 全栈构建（standalone） |
| `pnpm build:pages` | GitHub Pages 静态导出 |
| `pnpm db:setup` | 推送 schema 并 seed |

CI 会在 push / PR 时自动跑 typecheck、lint、db setup、build，以及独立的 Pages 静态导出构建。

## 提交规范

- 一个 PR 聚焦一件事（修 bug、补文档、加能力等）
- 不要提交 `.env` 或含密钥的文件
- commit message 用中文或英文均可，写清「为什么」

## 推荐阅读顺序

1. `src/lib/documents-service.ts` — 上传、切片、向量写入
2. `src/lib/vector-search.ts` / `src/lib/embeddings.ts` — 检索与 embedding
3. `src/app/api/chat/route.ts` — 切片召回 + 流式对话
4. `scripts/build-pages.mjs` — Pages 静态构建（临时移走 API 路由）

## 报告问题

- Bug：附上复现步骤、期望与实际行为、环境（Node 版本、是否启用 Ollama / PostgreSQL）
- 功能建议：说明学习场景与预期收益
