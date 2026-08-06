-- Deprecated: pg_trgm is enabled via prisma/sql/extensions.sql during db:seed.
-- Kept for manual one-off runs:
-- psql $DATABASE_URL -f prisma/sql/extensions.sql
-- psql $DATABASE_URL -f prisma/sql/hybrid-search-indexes.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
