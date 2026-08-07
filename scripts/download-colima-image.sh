#!/usr/bin/env bash
# 手动下载 Colima 虚拟机镜像（GitHub 慢/超时时用）
# 用法：bash scripts/download-colima-image.sh
set -euo pipefail

VERSION="v0.10.4"
FILE="ubuntu-24.04-minimal-cloudimg-arm64-docker.raw.gz"
URL="https://github.com/abiosoft/colima-core/releases/download/${VERSION}/${FILE}"
DEST="${HOME}/Downloads/${FILE}"

echo "目标文件: ${DEST}"
echo "官方地址: ${URL}"
echo

if [[ -f "${DEST}" ]]; then
  echo "文件已存在，跳过下载。"
else
  echo "尝试下载（约 300MB，请耐心等待）…"
  if command -v curl >/dev/null 2>&1; then
    # 先试官方；失败可设 MIRROR 前缀，例如：
    # export COLIMA_IMAGE_MIRROR="https://ghfast.top/"
    MIRROR="${COLIMA_IMAGE_MIRROR:-}"
    if curl -fL --connect-timeout 15 --retry 3 --retry-delay 2 \
      -o "${DEST}.part" "${MIRROR}${URL}"; then
      mv "${DEST}.part" "${DEST}"
    else
      rm -f "${DEST}.part"
      echo
      echo "自动下载失败。请用浏览器打开以下任一链接，保存为："
      echo "  ${DEST}"
      echo
      echo "  ${URL}"
      echo "  ${MIRROR}${URL}"
      echo
      echo "下载完成后重新运行本脚本，或直接："
      echo "  colima start --cpu 4 --memory 8 --disk 100 --disk-image ${DEST}"
      exit 1
    fi
  else
    echo "未找到 curl，请浏览器下载后放到 ${DEST}"
    exit 1
  fi
fi

echo
echo "下载完成。启动 Colima："
echo "  colima delete -f 2>/dev/null || true"
echo "  colima start --cpu 4 --memory 8 --disk 100 --vm-type=vz --vz-rosetta --disk-image ${DEST}"
echo "  docker context use colima"
echo "  docker info"
