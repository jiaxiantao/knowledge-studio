const DEFAULT_ALLOWED_HEADERS =
  "Authorization, Content-Type, Accept, X-Request-Id";

export function parseCorsOrigins() {
  return (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function applyCorsHeaders(
  request: Request,
  headers: Headers,
): void {
  const origins = parseCorsOrigins();
  if (origins.length === 0) {
    return;
  }

  const origin = request.headers.get("origin");
  if (!origin || !origins.includes(origin)) {
    return;
  }

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
  headers.set("Vary", "Origin");
}

export function corsPreflightResponse(request: Request) {
  const headers = new Headers();
  applyCorsHeaders(request, headers);
  if (!headers.has("Access-Control-Allow-Origin")) {
    return new Response(null, { status: 204 });
  }
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
}
