import { useMemo } from "react";
import { parseTemplateBody, type InlineToken } from "@/lib/document-template";
import type { DocumentFields, DocumentInfo } from "@/lib/types";
import { Blank } from "./Blank";

const DEPTH_INDENT = ["", "ml-6", "ml-12", "ml-[4.5rem]"];

function renderTokens(tokens: InlineToken[], data: DocumentFields, keyPrefix: string) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.type) {
      case "text":
        return <span key={key}>{token.value}</span>;
      case "bold":
        return (
          <strong key={key} className="font-semibold">
            {renderTokens(token.tokens, data, key)}
          </strong>
        );
      case "blank":
        return <Blank key={key} value={data[token.label] ?? ""} label={token.label} />;
      case "link":
        return (
          <a key={key} href={token.url} className="underline" target="_blank" rel="noreferrer">
            {token.text}
          </a>
        );
    }
  });
}

function KeyTermField({ label, value }: { label: string; value: string }) {
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

export function DocumentPreview({
  document,
  data,
}: {
  document: DocumentInfo;
  data: DocumentFields;
}) {
  const items = useMemo(() => parseTemplateBody(document.content), [document.content]);

  return (
    <div
      id="document-preview"
      className="bg-paper text-ink font-serif shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]"
    >
      <div className="mx-auto max-w-[46rem] px-8 py-12 sm:px-14 sm:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stamp">
          Common Paper · {document.name}
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{document.name}</h1>

        <section className="mt-10 border-t border-paper-edge pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
            Key Terms
          </h2>

          <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 text-[15px] sm:grid-cols-2">
            {document.fields.map((label) => (
              <KeyTermField key={label} label={label} value={data[label] ?? ""} />
            ))}
          </dl>
        </section>

        <section className="mt-10 border-t border-paper-edge pt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
            Standard Terms
          </h2>

          <div className="mt-5 space-y-4 text-[15px] leading-relaxed">
            {items.map((item, index) => (
              <p
                key={index}
                className={DEPTH_INDENT[Math.min(item.depth, DEPTH_INDENT.length - 1)]}
              >
                {item.marker && <span className="mr-1">{item.marker}</span>}
                {renderTokens(item.tokens, data, `item-${index}`)}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
