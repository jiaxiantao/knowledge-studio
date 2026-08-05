export type KnowledgeBaseRecord = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  readyDocumentCount: number;
};
