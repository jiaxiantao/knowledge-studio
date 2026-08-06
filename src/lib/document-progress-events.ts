import type { DocumentRecord } from "@/lib/documents-service";

type DocumentProgressListener = (document: DocumentRecord) => void;

const listenersByKnowledgeBase = new Map<
  string,
  Set<DocumentProgressListener>
>();

export function subscribeDocumentProgress(
  knowledgeBaseId: string,
  listener: DocumentProgressListener,
) {
  let listeners = listenersByKnowledgeBase.get(knowledgeBaseId);
  if (!listeners) {
    listeners = new Set();
    listenersByKnowledgeBase.set(knowledgeBaseId, listeners);
  }

  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      listenersByKnowledgeBase.delete(knowledgeBaseId);
    }
  };
}

export function publishDocumentProgress(document: DocumentRecord) {
  const listeners = listenersByKnowledgeBase.get(document.knowledgeBaseId);
  if (!listeners?.size) {
    return;
  }

  for (const listener of listeners) {
    listener(document);
  }
}
