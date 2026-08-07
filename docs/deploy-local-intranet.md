# 本机全栈 / 内网机房部署

目标：同一套 Docker Compose 在本机跑通后，拷到公司内网小机房只改 `.env` 即可。

> **macOS：** 不要用收费的 Docker Desktop。用免费 [Colima](./setup-colima-macos.md)（`bash scripts/setup-colima.sh`）即可跑 `docker compose`。

## 架构

| 服务 | 说明 |
|------|------|
| `db` | PostgreSQL + pgvector；端口仅绑定 `127.0.0.1`，不对局域网暴露 |
| `ollama` | 对话 + embedding 模型（`profile: full`） |
| `ollama-init` | 首次拉取 `OLLAMA_MODEL` / `OLLAMA_EMBED_MODEL` |
| `migrate` | `prisma db push` + seed |
| `web` | Next.js standalone（业务 + API） |

```bash
# 开发：只起数据库，宿主机 pnpm + 宿主机 Ollama
docker compose up -d db

# 全栈：本机或内网机房
cp .env.docker.example .env
# 编辑 .env：AUTH_JWT_SECRET、POSTGRES_PASSWORD、NEXT_PUBLIC_SITE_URL …
docker compose --profile full up --build -d
```

首次启动会拉模型，体积大、耗时长，可用：

```bash
docker compose --profile full logs -f ollama-init
```

就绪后打开 `NEXT_PUBLIC_SITE_URL`（默认 http://localhost:3000），注册账号即可用。

健康检查：`GET /api/health`（`ok`=库可用，`ready`=库 + Ollama 可达）。

## 局域网给同事用

1. 查本机局域网 IP（如 `192.168.1.23`）。
2. `.env` 中设置：

```env
WEB_PORT=3000
NEXT_PUBLIC_SITE_URL=http://192.168.1.23:3000
```

3. 重启 web：`docker compose --profile full up -d web`
4. 防火墙放行 `WEB_PORT`；**不要**把 `5432` 放到局域网（当前已绑定回环）。
5. 若前端与 API 不同源，设置 `CORS_ORIGINS=http://192.168.1.23:3000`。

## 迁到公司内网机房

1. 安装 Docker Engine + Compose（Linux 机房）或本机 [Colima](./setup-colima-macos.md)。
2. 复制 `.env.docker.example` → `.env`，至少修改：
   - `AUTH_JWT_SECRET`（≥24 位随机串，禁止 `change-me`）
   - `POSTGRES_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL=http://<机房主机IP或内网域名>:3000`
3. `docker compose --profile full up --build -d`
4. 等 `ollama-init` 完成；机房无外网时需提前导入模型到 `ollama-data` volume。
5. 防火墙只放行 `WEB_PORT`（及运维 SSH）。

### 备份

| Volume | 内容 |
|--------|------|
| `knowledge-studio_postgres-data` | 业务库 |
| `knowledge-studio_ollama-data` | 已拉模型 |
| `knowledge-studio_uploads-data` | 上传原文件 |

```bash
docker compose --profile full down   # 停服务，保留 volume
# 备份 volume 目录或 docker volume 导出，按机房规范执行
```

### NVIDIA GPU（可选）

默认 CPU，适合本机/无卡机房。有 NVIDIA 时可为 `ollama` 服务增加 GPU runtime（勿写入默认 compose，以免无卡环境失败）。参考 Ollama 官方 Docker GPU 文档。

## 运维速查

```bash
docker compose --profile full ps
docker compose --profile full logs -f web
curl -s http://127.0.0.1:3000/api/health | jq .
```

对外 API 默认每把 Key **30 次/分钟**（`API_CHAT_RATE_LIMIT_RPM`），超限返回 `429`。

## 与「仅开发」的区别

| | 开发 | 全栈 |
|--|------|------|
| 命令 | `docker compose up -d db` + `pnpm dev` | `docker compose --profile full up --build -d` |
| Ollama | 宿主机 | Compose 内 `ollama` |
| JWT | `.env` 可临时占位 | 生产校验拒绝弱密钥 |
