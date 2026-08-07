#!/usr/bin/env bash
# Colima：修复 DNS + 配置 Docker Hub 镜像加速（国内拉镜像 EOF / 超时）
set -euo pipefail

if ! colima status >/dev/null 2>&1; then
  echo "Colima 未运行。请先 colima start ..."
  exit 1
fi

MIRROR="${DOCKER_REGISTRY_MIRROR:-https://docker.m.daocloud.io}"

echo "==> 写入 VM DNS"
colima ssh -- sudo bash -c '
  mkdir -p /etc/systemd/resolved.conf.d
  cat >/etc/systemd/resolved.conf.d/colima-dns.conf <<EOF
[Resolve]
DNS=223.5.5.5 8.8.8.8
FallbackDNS=
DNSStubListener=no
EOF
  systemctl restart systemd-resolved 2>/dev/null || true
  rm -f /etc/resolv.conf
  cat >/etc/resolv.conf <<EOF
nameserver 223.5.5.5
nameserver 8.8.8.8
EOF
  chmod 644 /etc/resolv.conf
'

echo "==> 配置 Docker 镜像加速: ${MIRROR}"
colima ssh -- sudo tee /etc/docker/daemon.json >/dev/null <<EOF
{
  "registry-mirrors": ["${MIRROR}"]
}
EOF

echo "==> 重启 Docker"
colima ssh -- sudo systemctl restart docker
sleep 2

echo "==> 测试拉取 pgvector"
if docker pull pgvector/pgvector:pg16; then
  echo "OK。可执行: docker compose up -d db && pnpm db:setup"
  exit 0
fi

echo "镜像加速仍失败，尝试从镜像站直接拉并打 tag …"
if docker pull "${MIRROR}/pgvector/pgvector:pg16"; then
  docker tag "${MIRROR}/pgvector/pgvector:pg16" pgvector/pgvector:pg16
  echo "OK（已通过镜像站 tag）。可执行: docker compose up -d db && pnpm db:setup"
  exit 0
fi

echo "仍失败。检查网络/代理，或换镜像站后重试："
echo "  export DOCKER_REGISTRY_MIRROR=https://docker.1panel.live"
echo "  bash scripts/fix-colima-dns.sh"
