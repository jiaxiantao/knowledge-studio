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
| `/retrieval` | 混合检索试跑（向量 + 关键词，topK） |
| `/retrieval/eval` | 评测集 Hit@K / MRR + 检索融合说明 |
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
| `POST /api/retrieval` | 向量/混合检索 |
| `GET/POST /api/retrieval/eval` | 默认评测集 / 跑一轮 Hit@K·MRR |
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
| `RAG_KEYWORD_MIN_SCORE` | 混合检索关键词 leg 最低 trigram 分（默认 0.12） |
| `RAG_HYBRID` | 混合检索开关（默认开启；`0` 则仅向量） |
| `RAG_HYBRID_VECTOR_WEIGHT` | 混合检索向量 leg 权重（默认 0.6；两路命中时加权融合分用于排序与展示） |
| `INGEST_STUCK_MINUTES` | 解析超时判定（默认 15 分钟） |
| `PDF_OCR_ENABLED` | 扫描件 PDF 自动 OCR（默认开启） |
| `PDF_OCR_LANGS` | OCR 语言，默认 `chi_sim`（需对应 `@tesseract.js-data/*` 包） |
| `PDF_OCR_MAX_PAGES` | 单文件 OCR 页数上限（默认 1000） |
| `PDF_SPARSE_PAGE_CHARS` | 低于该字数/页时触发 selective OCR（默认 40） |
| `RAG_CHUNK_MAX_CHARS` | 切片字符上限（默认 512） |
| `RAG_CHUNK_OVERLAP` | 切片重叠（默认 64） |
| `PDF_OCR_SCALE` | OCR 渲染倍率 1–3（默认 1.5，越大越慢越清晰） |
| `LLM_DISABLED` | CI/演示模式，跳过真实 LLM 调用 |

## 混合检索如何融合（答辩口述）

1. **两路召回**：向量（pgvector）+ 关键词（pg_trgm）各自取候选。  
2. **阈值**：向量分 ≥ `RAG_MIN_SCORE` **或** 关键词分 ≥ `RAG_KEYWORD_MIN_SCORE`。  
3. **打分**：两路都命中 → `score = w·vector + (1−w)·keyword`（`w` 默认 0.6）；单路 → 用该路分数。  
4. **排序展示**：按 `score` 降序截断 topK；问答引用与检索工作台同一套分数。

界面说明见 [`/retrieval/eval`](http://localhost:3000/retrieval/eval)。

## 评测集与旧库重解析

1. **重解析**：知识管理 → 批量操作 →「按新切分重解析」（含已就绪文档）；或  
   `pnpm reparse:kb -- --kb <knowledgeBaseId>`（需 `pnpm dev`）。  
2. **评测**：打开 `/retrieval/eval`，选用例集（软考 / 技术博客 / 混合）与对应知识库 →「跑一轮评测」。  
   - **Hit@K / MRR**：只统计「应命中」题  
   - **正确拒答率**：只统计「应不命中」题（弱噪声命中不扣分，可用 `rejectBelowScore`）  
3. 默认用例在 `src/lib/rag-eval/cases.ts`，已按本地「软考相关知识」「我的技术博客」真实文件名对齐。

## 许可

[MIT](./LICENSE)
