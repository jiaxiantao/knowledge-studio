#!/usr/bin/env bash
# 用免费的 Colima 替代 Docker Desktop（API 兼容 docker / compose）
# 用法：bash scripts/setup-colima.sh
set -euo pipefail

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令：$1"
    return 1
  fi
  return 0
}

echo "==> 检查 Docker CLI（只需客户端，不必装 Desktop）"
if ! need_cmd docker; then
  echo "请先安装 Docker CLI，例如：brew install docker docker-compose"
  echo "若 brew 因 macOS 版本报错，可从官网仅装 CLI，或升级 Homebrew 后再试。"
  exit 1
fi

if ! command -v colima >/dev/null 2>&1; then
  echo "==> 安装 Colima + Lima"
  if command -v brew >/dev/null 2>&1; then
    if ! brew install colima docker-compose; then
      echo "brew 安装失败。可手动下载："
      echo "  https://github.com/abiosoft/colima/releases"
      echo "  https://github.com/lima-vm/lima/releases"
      echo "将 colima、limactl 放到 PATH 后重跑本脚本。"
      exit 1
    fi
  else
    echo "未找到 brew，请手动安装 Colima：https://github.com/abiosoft/colima#installation"
    exit 1
  fi
fi

echo "==> 若 Docker Desktop 正在运行，请先完全退出（菜单栏鲸鱼图标 → Quit）"
echo "    然后按回车继续…"
read -r _

# Apple Silicon 优先 Virtualization.framework；内存给足以便跑 ollama
ARCH=$(uname -m)
CPU=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
MEM_GB=8
if [[ "$(sysctl -n hw.memsize 2>/dev/null || echo 0)" -ge $((24 * 1024 * 1024 * 1024)) ]]; then
  MEM_GB=12
fi

VZ_ARGS=()
if [[ "$ARCH" == "arm64" ]]; then
  VZ_ARGS=(--vm-type=vz --vz-rosetta)
fi

echo "==> 启动 Colima（cpu=${CPU}, memory=${MEM_GB}GiB）"
if colima status 2>/dev/null | grep -qi "Running"; then
  echo "Colima 已在运行"
else
  colima start --cpu "$CPU" --memory "$MEM_GB" --disk 60 "${VZ_ARGS[@]}"
fi

echo "==> 切换 Docker context → colima"
docker context use colima >/dev/null
docker info >/dev/null
echo "当前 context: $(docker context show)"
echo
echo "完成。之后可用："
echo "  docker compose up -d db"
echo "  docker compose --profile full up --build -d"
echo
echo "建议卸载或勿再开机启动 Docker Desktop，避免抢占 docker.sock。"
