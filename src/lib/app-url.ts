/** Client/server base path for GitHub Pages subpath deploys. */
export function getBasePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  if (!raw || raw === "/") {
    return "";
  }
  return raw.replace(/\/$/, "");
}

export function withBasePath(path: string) {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
