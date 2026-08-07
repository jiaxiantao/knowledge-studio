const PLACEHOLDER_SECRETS = new Set([
  "",
  "change-me",
  "change-me-to-a-long-random-secret",
  "replace-with-a-long-random-string-at-least-32-chars",
]);

export function assertProductionAuthSecret() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  // Static GitHub Pages export has no auth runtime.
  if (process.env.GH_PAGES === "1" || process.env.NEXT_PUBLIC_STATIC_EXPORT === "1") {
    return;
  }

  const secret = process.env.AUTH_JWT_SECRET?.trim() ?? "";
  if (PLACEHOLDER_SECRETS.has(secret) || secret.length < 24) {
    throw new Error(
      "AUTH_JWT_SECRET must be set to a strong random value (≥24 chars) in production. See .env.docker.example.",
    );
  }
}
