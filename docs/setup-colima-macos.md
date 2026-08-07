# macOS：用免费 Colima 替代 Docker Desktop

Docker **CLI**（`docker` / `compose`）免费；收费的是 **Docker Desktop** 图形壳。本项目只依赖 CLI + 一个 Linux 虚拟机，推荐用开源 **[Colima](https://github.com/abiosoft/colima)**。

## 一键切换

```bash
bash scripts/setup-colima.sh
```

脚本会：安装 Colima（若尚未安装）→ 提示退出 Desktop → 启动虚拟机 → `docker context use colima`。

## 手动步骤

1. **退出并停用 Docker Desktop**  
   菜单栏鲸鱼图标 → Quit Docker Desktop。系统设置里关掉「登录时打开」。

2. **安装 Colima**（任选）

```bash
# Homebrew（推荐）
brew install colima docker docker-compose

# 若 brew 报 unknown macOS version：先升级 Homebrew，或从 GitHub Releases 下载
# colima / limactl 二进制放到 PATH
```

3. **启动（Apple Silicon 示例，内存按本机调整）**

```bash
colima start --cpu 4 --memory 8 --disk 60 --vm-type=vz --vz-rosetta
docker context use colima
docker info   # 应显示 Server，且无 Desktop 报错
```

### GitHub 下载镜像极慢 / 超时

Colima 首次启动要从 GitHub 拉约 300MB 的虚拟机盘：

`https://github.com/abiosoft/colima-core/releases/download/v0.10.4/ubuntu-24.04-minimal-cloudimg-arm64-docker.raw.gz`

**推荐：浏览器或下载工具下好后，本地指定路径启动**（Colima 0.10+ 支持）：

```bash
# 1) 浏览器打开上面链接，保存到 ~/Downloads/
#    或用代理终端：export https_proxy=http://127.0.0.1:7890

bash scripts/download-colima-image.sh

# 2) 用本地镜像启动（路径按实际）
colima delete -f 2>/dev/null || true
colima start --cpu 4 --memory 8 --disk 100 --vm-type=vz --vz-rosetta \
  --disk-image ~/Downloads/ubuntu-24.04-minimal-cloudimg-arm64-docker.raw.gz

docker context use colima
docker info
```

镜像只需下载一次；成功后以后直接 `colima start` 即可。

### Colima 内拉 Docker 镜像失败（DNS / Docker Hub）

报错类似 `lookup registry-1.docker.io on [::1]:53: connection refused` 时，是 **VM 内 DNS 未配置好**（常见于刚换 Colima）。

```bash
colima stop
colima start --cpu 4 --memory 8 --disk 100 --vm-type=vz --vz-rosetta \
  --dns 223.5.5.5 --dns 8.8.8.8
docker context use colima
docker pull pgvector/pgvector:pg16   # 先测能否拉镜像
```

若仍报 `[::1]:53` 或 `EOF`（DNS 已通但 Hub 连不上），运行：

```bash
bash scripts/fix-colima-dns.sh
```

脚本会配置 DNS + 国内镜像加速（默认 DaoCloud），并尝试 `docker pull pgvector/pgvector:pg16`。

仍不行则 **delete 后带 DNS 重建**（若曾用手动镜像，需再加 `--disk-image`）：

```bash
colima delete -f
colima start --cpu 4 --memory 8 --disk 100 --vm-type=vz --vz-rosetta \
  --dns 223.5.5.5 --dns 8.8.8.8 \
  --disk-image ~/Downloads/ubuntu-24.04-minimal-cloudimg-arm64-docker.raw.gz
docker context use colima
docker pull pgvector/pgvector:pg16
```

若仍慢，可在 Colima 里加国内镜像加速（任选）：

```bash
colima ssh -- sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
EOF
colima restart
```

然后回到项目：

```bash
docker compose up -d db
pnpm db:setup
```

4. **验证本项目**

```bash
docker compose up -d db
# 或全栈：
# docker compose --profile full up --build -d
```

## 日常使用

| 操作 | 命令 |
|------|------|
| 开机后起引擎 | `colima start` |
| 停止 | `colima stop` |
| 看状态 | `colima status` / `docker context show` |

把 `colima start` 加到登录项或 shell 配置里即可替代 Desktop 开机自启。

## 其它免费方案

- **[Rancher Desktop](https://rancherdesktop.io/)**：带 UI，可选 dockerd，完全开源  
- **Podman**：命令略有差异，本仓库文档按 `docker compose` 编写，优先 Colima

## 注意

- 从 Desktop 迁到 Colima 后，**旧 Desktop 里的 volume / 镜像不会自动带过来**；数据库需重新 `compose up` 或自行备份迁移。  
- 全栈含 Ollama 时建议 Colima 内存 ≥ 8GB。  
- 内网机房 Linux 主机一般直接装 Docker Engine（无需 Desktop / Colima）。
