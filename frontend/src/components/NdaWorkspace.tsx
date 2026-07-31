"use client";

import { useMemo, useRef, useState } from "react";
import { ChatPanel } from "./ChatPanel";
import { DocumentPreview } from "./DocumentPreview";
import { IntakeForm } from "./IntakeForm";
import { formatDisplayDate } from "@/lib/format";
import { EMPTY_FORM_DATA, type FieldKey, type NdaFormData } from "@/lib/types";

const TOTAL_FIELDS = Object.keys(EMPTY_FORM_DATA).length;

export function NdaWorkspace() {
  const [formData, setFormData] = useState<NdaFormData>(EMPTY_FORM_DATA);
  const [isExporting, setIsExporting] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: FieldKey, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const displayData = useMemo(
    () => ({ ...formData, effectiveDate: formatDisplayDate(formData.effectiveDate) }),
    [formData]
  );

  const completedCount = useMemo(
    () => Object.values(formData).filter((value) => value.trim().length > 0).length,
    [formData]
  );

  const handleDownload = async () => {
    if (!documentRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const partyLabel = formData.partyAName || formData.partyBName ? "-" : "";
      const filename = `mutual-nda${partyLabel}${[formData.partyAName, formData.partyBName]
        .filter(Boolean)
        .join("-")}.pdf`
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, "-");

      await html2pdf()
        .set({
          margin: 0,
          filename: filename || "mutual-nda.pdf",
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

  return (
    <div className="min-h-screen bg-desk">
      <header className="border-b border-desk-border px-6 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stamp-soft">
              Mutual NDA · Draft
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-pad sm:text-4xl">
              Build a Mutual NDA
            </h1>
            <p className="mt-2 max-w-lg text-sm text-pad-muted-1">
              Fill in the blanks. Watch the agreement assemble itself. Download it when
              it&apos;s ready.
            </p>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:items-end">
            <p className="font-mono text-xs text-pad-muted-2">
              {completedCount} / {TOTAL_FIELDS} fields complete
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="whitespace-nowrap bg-stamp px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-paper transition-colors hover:bg-stamp-soft disabled:cursor-wait disabled:opacity-60"
            >
              {isExporting ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <div className="space-y-8 bg-pad px-6 py-8 sm:px-8">
          <ChatPanel fields={formData} onFieldsChange={setFormData} />

          <details className="group border-t border-pad-line pt-6">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.16em] text-stamp">
              Edit fields manually
            </summary>
            <div className="mt-6">
              <IntakeForm data={formData} onChange={handleChange} />
            </div>
          </details>
        </div>

        <div className="overflow-x-auto pb-10">
          <div ref={documentRef}>
            <DocumentPreview data={displayData} />
          </div>
        </div>
      </main>
    </div>
  );
}
