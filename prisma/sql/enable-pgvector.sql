-- One-time: enable pgvector (run in Supabase SQL editor if needed)
CREATE EXTENSION IF NOT EXISTS vector;

-- After switching from 768-d Gemini embeddings to 384-d MiniLM,
-- recreate the embedding column (existing vectors become invalid).
ALTER TABLE "CodeChunk" DROP COLUMN IF EXISTS embedding;
ALTER TABLE "CodeChunk" ADD COLUMN embedding vector(384);
