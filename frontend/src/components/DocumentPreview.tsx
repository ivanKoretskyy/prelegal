import { ATTRIBUTION, STANDARD_TERMS_PARAGRAPHS } from "@/lib/standard-terms";
import type { NdaFormData } from "@/lib/types";
import { Blank } from "./Blank";

function CoverField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted-1">
        {label}
      </dt>
      <dd className="mt-1 border-b border-dashed border-paper-edge pb-1">
        <Blank value={value} label={label} />
      </dd>
    </div>
  );
}

export function DocumentPreview({ data }: { data: NdaFormData }) {
  return (
    <div
      id="nda-document"
      className="bg-paper text-ink font-serif shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]"
    >
      <div className="mx-auto max-w-[46rem] px-8 py-12 sm:px-14 sm:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stamp">
          Common Paper · Mutual NDA
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
          Mutual Non-Disclosure Agreement
        </h1>

        <section className="mt-10 border-t border-paper-edge pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
            Cover Page
          </h2>

          <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 text-[15px] sm:grid-cols-2">
            <CoverField label="Party A name" value={data.partyAName} />
            <CoverField label="Party B name" value={data.partyBName} />
            <CoverField label="Party A address" value={data.partyAAddress} />
            <CoverField label="Party B address" value={data.partyBAddress} />
            <CoverField label="Purpose" value={data.purpose} />
            <CoverField label="Effective Date" value={data.effectiveDate} />
            <CoverField label="MNDA Term" value={data.mndaTerm} />
            <CoverField label="Term of Confidentiality" value={data.termOfConfidentiality} />
            <CoverField label="Governing Law" value={data.governingLaw} />
            <CoverField label="Jurisdiction" value={data.jurisdiction} />
          </dl>
        </section>

        <section className="mt-10 border-t border-paper-edge pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
            Standard Terms
          </h2>

          <div className="mt-5 space-y-5 text-[15px] leading-relaxed">
            {STANDARD_TERMS_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph.id}>
                {paragraph.tokens.map((token, index) => {
                  if (token.type === "text") {
                    return <span key={index}>{token.value}</span>;
                  }
                  if (token.type === "bold") {
                    return (
                      <strong key={index} className="font-semibold">
                        {token.value}
                      </strong>
                    );
                  }
                  return (
                    <Blank key={index} value={data[token.field]} label={token.label} />
                  );
                })}
              </p>
            ))}
          </div>
        </section>

        <p className="mt-10 border-t border-paper-edge pt-6 font-mono text-[11px] leading-relaxed text-ink-muted-2">
          {ATTRIBUTION}
        </p>
      </div>
    </div>
  );
}
