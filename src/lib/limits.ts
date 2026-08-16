/** Analysis size limits from the PRD (section 15.1) */
export const MAX_REPO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_FILE_COUNT = 1000;
export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB

/** @deprecated Prefer plan-aware limits via src/lib/billing/plans.ts */
export const MAX_ANALYSES_PER_DAY = 5;

/** @deprecated Prefer plan-aware chat limits via billing plans */
export const MAX_CHAT_MESSAGES_PER_HOUR = 20;

/** RAG retrieval size from the PRD (section 15.4) */
export const RAG_TOP_K = 8;

/** Source file extensions that are parsed and chunked */
export const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
]);

/** Always-excluded path segments / filenames */
export const ALWAYS_EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".vercel",
  ".data",
]);

export const ALWAYS_EXCLUDE_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
]);
