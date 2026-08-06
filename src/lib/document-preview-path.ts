export function documentPreviewPath(
  documentId: string,
  knowledgeBaseId?: string,
) {
  const params = new URLSearchParams({ id: documentId });
  if (knowledgeBaseId) {
    params.set("kb", knowledgeBaseId);
  }
  return `/knowledge/preview?${params.toString()}`;
}
