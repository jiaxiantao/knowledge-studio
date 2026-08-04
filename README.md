# Knowledge Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

专注于 **PostgreSQL 笔记库 + pg_trgm 检索 + grounded AI 助手** 的 Next.js 项目。

从 [ai-my-home](https://github.com/jiaxiantao/ai-my-home) 抽离的笔记知识库能力，适合用来理解：如何用 pg_trgm 做相似度检索、如何把笔记作为 Assistant 的召回源、以及管理员 CRUD 与流式对话如何配合。

**线上预览：** [https://jiaxiantao.xyz/knowledge-studio/](https://jiaxiantao.xyz/knowledge-studio/)（Pages：[jiaxiantao.github.io/knowledge-studio](https://jiaxiantao.github.io/knowledge-studio/)）

## 能力

| 页面 | 说明 |
|------|------|
| `/notes` | 笔记库：pg_trgm 检索演示、双引擎对比、公开笔记列表、管理员维护入口 |
| `/notes/[slug]` | 笔记详情与相关推荐 |
| `/assistant` | 基于笔记召回的流式 AI 对话（SSE、多会话、置信度） |

| API | 说明 |
|-----|------|
| `GET /api/notes/search` | pg_trgm / memory 检索 |
| `GET/POST /api/notes` | 笔记列表与创建（写操作需 admin） |
| `POST /api/chat` | 流式对话 |
| `GET /api/health` | DB + pg_trgm + LLM 状态 |
| `POST /api/auth/login` | 管理员登录 |

## 快速开始

```bash
pnpm i
cp .env.example .env
docker compose up -d db
pnpm db:setup
pnpm dev
```

浏览器打开 [http://localhost:3000/notes](http://localhost:3000/notes)。

### Docker 全栈

```bash
docker compose up --build
```

### GitHub Pages 静态导出（可选）

```bash
GH_PAGES=1 pnpm build:pages
# 输出在 out/，basePath 为 /knowledge-studio
```

## 技术栈

- Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
- Prisma · PostgreSQL（`pg_trgm` 可选，无扩展时回退内存打分）
- OpenAI SDK（兼容 Ollama）
- ECharts · react-markdown · motion · lucide-react

## 环境变量

见 [`.env.example`](./.env.example)。关键项：

- `DATABASE_URL` — PostgreSQL 连接
- `AUTH_TOKEN_SECRET` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` — 笔记维护登录
- `LLM_PROVIDER` / `OLLAMA_*` 或 `OPENAI_*` — 对话模型

## 许可

[MIT](./LICENSE)
