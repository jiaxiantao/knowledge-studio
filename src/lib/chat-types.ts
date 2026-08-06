export type ChatImageAttachment = {
  name: string;
  dataUrl: string;
};

export type ChatMessageStatus = "streaming" | "complete" | "stopped" | "error";

export type ChatMessageReference = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  knowledgeBaseId?: string;
  score?: number;
  similarity?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ChatImageAttachment[];
  status?: ChatMessageStatus;
  confidence?: number;
  confidenceLabel?: string;
  alternatives?: string[];
  references?: ChatMessageReference[];
  createdAt: string;
};

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatBranch = {
  id: string;
  label: string;
  messages: ChatMessage[];
  forkedFromMessageId?: string;
  parentBranchId?: string;
};

export type ChatSession = {
  id: string;
  knowledgeBaseId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  activeBranchId: string;
  branches: ChatBranch[];
};

export type ChatStreamMeta = {
  confidence: number;
  confidenceLabel: string;
  alternatives: string[];
  mock?: boolean;
  searchMs?: number;
  minScore?: number;
  hitCount?: number;
};

export type ChatMetrics = {
  searchMs?: number;
  ttftMs?: number;
  totalMs?: number;
};
