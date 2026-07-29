"use client";

import type { FieldKey, NdaFormData } from "@/lib/types";

const inputClasses =
  "w-full border-0 border-b border-pad-line bg-transparent px-0 py-1.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-stamp focus:outline-none";

function TextField({
  field,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  field: FieldKey;
  label: string;
  placeholder: string;
  value: string;
  onChange: (field: FieldKey, value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(field, event.target.value)}
        className={inputClasses}
      />
    </label>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-stamp">
      {children}
    </h2>
  );
}

export function IntakeForm({
  data,
  onChange,
}: {
  data: NdaFormData;
  onChange: (field: FieldKey, value: string) => void;
}) {
  return (
    <form className="space-y-10" onSubmit={(event) => event.preventDefault()}>
      <section className="space-y-5">
        <SectionHeading>Parties</SectionHeading>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <TextField
            field="partyAName"
            label="Party A name"
            placeholder="Acme, Inc."
            value={data.partyAName}
            onChange={onChange}
          />
          <TextField
            field="partyBName"
            label="Party B name"
            placeholder="Beta Labs LLC"
            value={data.partyBName}
            onChange={onChange}
          />
          <TextField
            field="partyAAddress"
            label="Party A address"
            placeholder="123 Market St, San Francisco, CA"
            value={data.partyAAddress}
            onChange={onChange}
          />
          <TextField
            field="partyBAddress"
            label="Party B address"
            placeholder="456 Bryant St, San Francisco, CA"
            value={data.partyBAddress}
            onChange={onChange}
          />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading>Deal terms</SectionHeading>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              field="purpose"
              label="Purpose"
              placeholder="Evaluating a potential business relationship"
              value={data.purpose}
              onChange={onChange}
            />
          </div>
          <TextField
            field="effectiveDate"
            label="Effective Date"
            placeholder=""
            value={data.effectiveDate}
            onChange={onChange}
            type="date"
          />
          <TextField
            field="mndaTerm"
            label="MNDA Term"
            placeholder="1 year from the Effective Date"
            value={data.mndaTerm}
            onChange={onChange}
          />
          <TextField
            field="termOfConfidentiality"
            label="Term of Confidentiality"
            placeholder="3 years from disclosure"
            value={data.termOfConfidentiality}
            onChange={onChange}
          />
          <TextField
            field="governingLaw"
            label="Governing Law"
            placeholder="Delaware"
            value={data.governingLaw}
            onChange={onChange}
          />
          <div className="sm:col-span-2">
            <TextField
              field="jurisdiction"
              label="Jurisdiction"
              placeholder="San Francisco, California"
              value={data.jurisdiction}
              onChange={onChange}
            />
          </div>
        </div>
      </section>
    </form>
  );
}
