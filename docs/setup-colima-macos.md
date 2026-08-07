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
