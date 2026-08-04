# Knowledge Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

从 [ai-my-home](https://github.com/jiaxiantao/ai-my-home) 抽离的 **PostgreSQL 笔记知识库**：pg_trgm 模糊检索、CRUD API、双引擎对比演示，以及基于笔记召回的 Grounded Assistant。

在线预览：[https://jiaxiantao.xyz/knowledge-studio/](https://jiaxiantao.xyz/knowledge-studio/)

## 能力

| 模块 | 说明 |
|------|------|
| `/notes` | 笔记库 · pg_trgm 检索演示 · 双引擎对比 · 公开笔记浏览 |
| `/notes/[slug]` | 笔记详情与相关推荐 |
| `/assistant` | 笔记召回 + SSE 流式对话 |
| `GET /api/notes/search` | pg_trgm / memory 检索 |
| `GET /api/analytics/notes` | 标签分布与按月统计 |
| `POST /api/chat` | 检索增强问答 |

## 本地开发

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:setup
pnpm dev
```

默认端口 `3000`（Docker 组合为 `3001`）。

## 技术栈

Next.js 16 · React 19 · Prisma · PostgreSQL · pg_trgm · OpenAI SDK（Ollama 兼容）

## 部署

- Docker：`docker compose up --build`
- GitHub Pages：`GH_PAGES=1 GH_PAGES_BASE_PATH=/knowledge-studio pnpm build`
- Cloudflare Worker 路径前缀：`/knowledge-studio`
