export type ChatImageAttachment = {
  name: string;
  dataUrl: string;
};

export type ChatMessageStatus = "streaming" | "complete" | "stopped" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ChatImageAttachment[];
  status?: ChatMessageStatus;
  confidence?: number;
  alternatives?: string[];
  createdAt: string;
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
  title: string;
  updatedAt: string;
  activeBranchId: string;
  branches: ChatBranch[];
};

export type ChatStreamMeta = {
  confidence: number;
  confidenceLabel: string;
  alternatives: string[];
  mock?: boolean;
};

export type ChatMetrics = {
  searchMs?: number;
  ttftMs?: number;
  totalMs?: number;
};
