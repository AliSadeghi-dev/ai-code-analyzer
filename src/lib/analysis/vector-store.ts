import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { embedTexts, toVectorLiteral } from "@/lib/analysis/embeddings";
import type { CodeChunkDraft } from "@/lib/analysis/chunking";

export type StoredChunk = {
  id: string;
  filePath: string;
  content: string;
  startLine: number | null;
  endLine: number | null;
  score?: number;
};

/** Replace all code chunks for a project and store embeddings in pgvector. */
export async function storeProjectChunks(
  projectId: string,
  drafts: CodeChunkDraft[],
): Promise<number> {
  await prisma.codeChunk.deleteMany({ where: { projectId } });

  if (drafts.length === 0) {
    throw new Error("No code chunks were produced from the source files.");
  }

  const records = drafts.map((draft) => ({
    id: randomUUID(),
    projectId,
    filePath: draft.filePath,
    content: draft.content,
    startLine: draft.startLine,
    endLine: draft.endLine,
  }));

  // Insert rows first (embedding filled in a second pass)
  const INSERT_BATCH = 100;
  for (let i = 0; i < records.length; i += INSERT_BATCH) {
    await prisma.codeChunk.createMany({
      data: records.slice(i, i + INSERT_BATCH),
    });
  }

  const embeddings = await embedTexts(records.map((record) => record.content));

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]!;
    const embedding = embeddings[i]!;
    const vector = toVectorLiteral(embedding);

    await prisma.$executeRawUnsafe(
      `UPDATE "CodeChunk" SET embedding = $1::vector WHERE id = $2`,
      vector,
      record.id,
    );
  }

  return records.length;
}

/** Top-k similarity search over a project's code chunks. */
export async function searchProjectChunks(
  projectId: string,
  queryEmbedding: number[],
  limit = 8,
): Promise<StoredChunk[]> {
  const vector = toVectorLiteral(queryEmbedding);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      filePath: string;
      content: string;
      startLine: number | null;
      endLine: number | null;
      score: number;
    }>
  >(
    `
    SELECT
      id,
      "filePath",
      content,
      "startLine",
      "endLine",
      (1 - (embedding <=> $1::vector))::float8 AS score
    FROM "CodeChunk"
    WHERE "projectId" = $2
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $3
    `,
    vector,
    projectId,
    limit,
  );

  return rows;
}
