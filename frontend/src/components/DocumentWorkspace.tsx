"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { emptyFields, type DocumentFields, type DocumentInfo, type SavedDocument } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { DocumentPreview } from "./DocumentPreview";
import { IntakeForm } from "./IntakeForm";
import { MyDocumentsModal } from "./MyDocumentsModal";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type PendingLoad = { fields: DocumentFields; documentId: number };

export function DocumentWorkspace() {
  const { user } = useAuth();
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [fields, setFields] = useState<DocumentFields>({});
  const [isExporting, setIsExporting] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isMyDocumentsOpen, setIsMyDocumentsOpen] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);
  const documentRef = useRef<HTMLDivElement>(null);
  const pendingLoadRef = useRef<PendingLoad | null>(null);

  useEffect(() => {
    if (!documentType) return;
    let cancelled = false;

    fetch(apiUrl(`/api/templates/${documentType}`))
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load document");
        return response.json() as Promise<DocumentInfo>;
      })
      .then((info) => {
        if (cancelled) return;
        setDocumentInfo(info);
        const pending = pendingLoadRef.current;
        pendingLoadRef.current = null;
        if (pending) {
          setFields(pending.fields);
          setSavedDocumentId(pending.documentId);
        } else {
          setFields(emptyFields(info.fields));
          setSavedDocumentId(null);
        }
      })
      .catch(() => {
        pendingLoadRef.current = null;
        if (!cancelled) {
          setDocumentError("Couldn't load that document type. Try refreshing the page.");
        }
      });

    return () => {
      cancelled = true;
    };
    // chatResetKey is bumped on every explicit New Document/Load action, so
    // loading a saved document of the *same* type as the current one still
    // re-fetches and re-applies its fields instead of being skipped because
    // documentType itself didn't change.
  }, [documentType, chatResetKey]);

  const handleFieldChange = (label: string, value: string) => {
    setFields((current) => ({ ...current, [label]: value }));
  };

  const completedCount = useMemo(
    () => Object.values(fields).filter((value) => value.trim().length > 0).length,
    [fields]
  );

  const handleDownload = async () => {
    if (!documentRef.current || !documentInfo || isExporting) return;
    setIsExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      await html2pdf()
        .set({
          margin: 0,
          filename: `${slugify(documentInfo.name)}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: "#fffefb" },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(documentRef.current)
        .save();
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!documentType || isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = savedDocumentId
        ? await fetch(apiUrl(`/api/documents/${savedDocumentId}`), {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields }),
          })
        : await fetch(apiUrl("/api/documents"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: documentType, fields }),
          });
      if (!response.ok) throw new Error("Save failed");
      const saved: SavedDocument = await response.json();
      setSavedDocumentId(saved.id);
      setSaveMessage("Saved.");
    } catch {
      setSaveMessage("Couldn't save. Try again.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleNewDocument = () => {
    pendingLoadRef.current = null;
    setDocumentType(null);
    setDocumentInfo(null);
    setDocumentError(null);
    setFields({});
    setSavedDocumentId(null);
    setChatResetKey((key) => key + 1);
  };

  const handleLoadDocument = (document: SavedDocument) => {
    pendingLoadRef.current = { fields: document.fields, documentId: document.id };
    setIsMyDocumentsOpen(false);
    setDocumentType(document.filename);
    setChatResetKey((key) => key + 1);
  };

  return (
    <div className="min-h-screen bg-desk">
      <header className="border-b border-desk-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stamp-soft">
              {documentInfo ? documentInfo.name : "Prelegal"} · Draft
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-pad sm:text-4xl">
              {documentInfo ? `Build a ${documentInfo.name}` : "What agreement do you need?"}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-pad-muted-1">
              Chat with the assistant to describe your agreement. Watch it assemble itself.
              Download it when it&apos;s ready.
            </p>
          </div>
          {(user || documentInfo) && (
            <div className="flex flex-col items-end gap-4">
              {user && (
                <button
                  type="button"
                  onClick={() => setIsMyDocumentsOpen(true)}
                  className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-stamp-soft transition-colors hover:text-stamp"
                >
                  My Documents
                </button>
              )}
              {documentInfo && (
                <div className="flex flex-col items-end gap-2">
                  <p className="font-mono text-xs text-pad-muted-2">
                    {completedCount} / {documentInfo.fields.length} fields complete
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={handleNewDocument}
                      className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-pad-muted-2 transition-colors hover:text-pad"
                    >
                      New Document
                    </button>
                    {user && (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="whitespace-nowrap bg-stamp px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-paper transition-colors hover:bg-stamp-soft disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isExporting}
                      className="whitespace-nowrap bg-stamp px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-paper transition-colors hover:bg-stamp-soft disabled:cursor-wait disabled:opacity-60"
                    >
                      {isExporting ? "Preparing PDF…" : "Download PDF"}
                    </button>
                  </div>
                  {saveMessage && (
                    <p className="font-mono text-[11px] text-pad-muted-2">{saveMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <div className="space-y-8 bg-pad px-6 py-8 sm:px-8">
          <ChatPanel
            key={chatResetKey}
            documentType={documentType}
            onDocumentTypeChange={setDocumentType}
            fields={fields}
            onFieldsChange={setFields}
          />

          {documentInfo && (
            <details className="group border-t border-pad-line pt-6">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.16em] text-stamp">
                Edit fields manually
              </summary>
              <div className="mt-6">
                <IntakeForm
                  fieldLabels={documentInfo.fields}
                  data={fields}
                  onChange={handleFieldChange}
                />
              </div>
            </details>
          )}
        </div>

        <div className="overflow-x-auto pb-10">
          {documentError && <p className="text-sm text-blank-text">{documentError}</p>}
          {documentInfo && (
            <div ref={documentRef}>
              <DocumentPreview document={documentInfo} data={fields} />
            </div>
          )}
          {!documentInfo && !documentError && (
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-pad-muted-2">
              The document preview will appear here once we know what you need.
            </p>
          )}
        </div>
      </main>

      {isMyDocumentsOpen && (
        <MyDocumentsModal
          onClose={() => setIsMyDocumentsOpen(false)}
          onLoad={handleLoadDocument}
        />
      )}
    </div>
  );
}
