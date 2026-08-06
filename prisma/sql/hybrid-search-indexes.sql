-- Trigram indexes for keyword leg of hybrid retrieval (requires pg_trgm).
CREATE INDEX IF NOT EXISTS "Chunk_content_trgm_idx" ON "Chunk" USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Chunk_title_trgm_idx" ON "Chunk" USING gin (COALESCE(title, '') gin_trgm_ops);
