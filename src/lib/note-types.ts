export type NoteRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  contentMarkdown: string;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};
