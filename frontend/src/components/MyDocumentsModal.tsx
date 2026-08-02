"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { SavedDocument } from "@/lib/types";
import { Modal } from "./Modal";

function formatSavedAt(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function MyDocumentsModal({
  onClose,
  onLoad,
}: {
  onClose: () => void;
  onLoad: (document: SavedDocument) => void;
}) {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl("/api/documents"), { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load your documents");
        return response.json() as Promise<SavedDocument[]>;
      })
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your saved documents. Try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this saved document? This can't be undone.")) return;
    const response = await fetch(apiUrl(`/api/documents/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      setDocuments((current) => current.filter((document) => document.id !== id));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="My Documents">
      {isLoading && (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-pad-muted-2">
          Loading…
        </p>
      )}
      {error && <p className="text-sm text-blank-text">{error}</p>}
      {!isLoading && !error && documents.length === 0 && (
        <p className="text-sm text-pad-muted-1">
          Nothing saved yet. Build a document and hit Save to see it here.
        </p>
      )}
      <ul className="space-y-3">
        {documents.map((document) => (
          <li
            key={document.id}
            className="flex items-center justify-between gap-4 border border-pad-line bg-pad px-4 py-3"
          >
            <div>
              <p className="text-sm text-parchment-text">{document.documentName}</p>
              <p className="font-mono text-[11px] text-pad-muted-2">
                Saved {formatSavedAt(document.updatedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => onLoad(document)}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-stamp transition-colors hover:text-stamp-soft"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => handleDelete(document.id)}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-blank-text transition-colors hover:text-stamp-soft"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
