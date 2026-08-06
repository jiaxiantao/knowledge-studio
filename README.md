# Knowledge Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

轻量 **RAG 知识库控制台**：上传文件 → 切片 → pgvector 检索 → qwen3 问答。产品形态对标阿里云 Knowledge Studio 的核心链路。

**线上静态预览：** [https://jiaxiantao.xyz/knowledge-studio/](https://jiaxiantao.xyz/knowledge-studio/)（无上传/检索 API，仅只读壳）

> **安全说明：** 默认无登录鉴权，API 与分享链接均面向本机/内网可信环境。公网部署前请自行加鉴权或网络隔离。

## 能力

| 页面 | 说明 |
|------|------|
| `/knowledge` | 文档列表：状态、类目、批量操作、分页 |
| `/knowledge/upload` | 上传 md/txt/pdf（异步解析 + 进度） |
| `/knowledge/chunks?id=` | 切片详情：搜索、CRUD、启停检索 |
| `/retrieval` | 向量检索试跑（topK） |
| `/assistant` | 流式问答（思维链 → 结论），会话持久化到 DB |
| `/assistant/share?id=` | 分享对话只读页（复制链接打开） |

| API | 说明 |
|-----|------|
| `POST /api/documents` | 上传文档（**异步**解析/切片/向量化，立即返回 pending） |
| `GET /api/documents` | 文档列表 |
| `GET/POST /api/documents/[id]/chunks` | 切片列表 / 创建切片 |
| `PATCH/DELETE /api/documents/[id]/chunks/[chunkId]` | 更新 / 删除切片 |
| `POST /api/documents/batch` | 批量删除 / 强制重试解析 |
| `GET /api/documents/[id]/file` | 下载源文件 |
| `GET/POST /api/categories` | 类目列表 / 创建 |
| `GET/POST/PUT/DELETE /api/chat/sessions` | 问答会话 CRUD |
| `POST /api/retrieval` | 向量检索 |
| `POST /api/chat` | 切片召回 + 流式问答 |
| `POST /api/chat/suggestions` | 推荐追问 |
| `GET /api/health` | DB + LLM 状态 |

## 快速开始

```bash
pnpm i
cp .env.example .env
docker compose up -d db
pnpm db:setup

# Ollama：对话模型 + 向量模型
ollama pull qwen3
ollama pull nomic-embed-text

pnpm dev
```

浏览器打开 [http://localhost:3000/knowledge](http://localhost:3000/knowledge)。

> 若本机已有旧版 Postgres 卷，换成 pgvector 镜像后需重建：`docker compose down -v && docker compose up -d db && pnpm db:setup`。

### Docker 全栈

```bash
docker compose up --build
```

### GitHub Pages 静态导出（可选）

```bash
GH_PAGES=1 pnpm build:pages
# 输出在 out/；无 API，上传/检索/问答会显示静态降级提示
```

## 技术栈

- Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
- Prisma · PostgreSQL + **pgvector**
- Ollama：`qwen3`（对话）· `nomic-embed-text`（768 维向量）
- 本地上传目录：`data/uploads/`

## 环境变量

见 [`.env.example`](.env.example)。关键项：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL（需启用 `vector` 扩展） |
| `OLLAMA_MODEL` / `OLLAMA_EMBED_MODEL` | 对话与 embedding 模型 |
| `OLLAMA_NATIVE_BASE_URL` | embedding 原生 Ollama 地址（可选） |
| `UPLOAD_DIR` | 上传文件目录（默认 `data/uploads`） |
| `MAX_UPLOAD_BYTES` | 上传绝对上限（默认 150MB；表格/图片/文本另有更严类型限制） |
| `RAG_MIN_SCORE` | 向量召回最低分（默认 0.42） |
| `INGEST_STUCK_MINUTES` | 解析超时判定（默认 15 分钟） |
| `PDF_OCR_ENABLED` | 扫描件 PDF 自动 OCR（默认开启） |
| `PDF_OCR_LANGS` | OCR 语言，默认 `chi_sim`（需对应 `@tesseract.js-data/*` 包） |
| `PDF_OCR_MAX_PAGES` | 单文件最多 OCR 页数（默认 40） |
| `PDF_OCR_SCALE` | OCR 渲染倍率 1–3（默认 1.5，越大越慢越清晰） |
| `LLM_DISABLED` | CI/演示模式，跳过真实 LLM 调用 |

## 许可

[MIT](./LICENSE)
