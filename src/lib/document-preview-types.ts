export type DocumentPreviewMode =
  | "pdf"
  | "image"
  | "markdown"
  | "text"
  | "html"
  | "rich-html"
  | "spreadsheet"
  | "text-extract";

export type SpreadsheetPreviewSheet = {
  name: string;
  html: string;
};

export type DocumentPreviewPayload = {
  mode: DocumentPreviewMode;
  fileUrl?: string;
  content?: string;
  sheets?: SpreadsheetPreviewSheet[];
  notice?: string;
};
