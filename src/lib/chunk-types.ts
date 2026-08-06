export const CHUNK_TITLE_MAX = 50;
export const CHUNK_CONTENT_MAX = 6000;

export type ChunkLevel = "leaf" | "parent" | "child";

export type ChunkRecord = {
  id: string;
  documentId: string;
  index: number;
  title: string;
  content: string;
  tokenEstimate: number;
  enabled: boolean;
  level: ChunkLevel;
  parentId: string | null;
  createdAt: string;
};
