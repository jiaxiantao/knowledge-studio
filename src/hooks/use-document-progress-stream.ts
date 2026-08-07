"use client";

import { useEffect } from "react";

import { getAuthToken } from "@/lib/auth-client";
import type { DocumentRecord } from "@/lib/documents-service";

type UseDocumentProgressStreamOptions = {
  knowledgeBaseId: string;
  enabled: boolean;
  onDocument: (document: DocumentRecord) => void;
};

export function useDocumentProgressStream({
  knowledgeBaseId,
  enabled,
  onDocument,
}: UseDocumentProgressStreamOptions) {
  useEffect(() => {
    if (!enabled || !knowledgeBaseId) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      return;
    }

    const params = new URLSearchParams({
      knowledgeBaseId,
      access_token: token,
    });
    const source = new EventSource(`/api/documents/stream?${params.toString()}`);

    source.addEventListener("document", (event) => {
      try {
        const payload = JSON.parse(event.data) as { document?: DocumentRecord };
        if (payload.document) {
          onDocument(payload.document);
        }
      } catch {
        // ignore malformed payloads
      }
    });

    return () => {
      source.close();
    };
  }, [enabled, knowledgeBaseId, onDocument]);
}
