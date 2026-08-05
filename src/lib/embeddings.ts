import { EMBEDDING_DIMENSIONS, getEmbedModel, getOllamaBaseUrl } from "@/lib/rag-config";

export async function embedText(text: string): Promise<number[]> {
  const model = getEmbedModel();
  const baseUrl = getOllamaBaseUrl();

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Embedding failed (${response.status}): ${body || response.statusText}. Ensure Ollama is running and model '${model}' is pulled.`,
    );
  }

  const payload = (await response.json()) as { embedding?: number[] };
  const embedding = payload.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding response missing vector");
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected embedding dim ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    );
  }

  return embedding;
}

export function toPgVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}
