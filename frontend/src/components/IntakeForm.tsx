"use client";

import type { DocumentFields } from "@/lib/types";

export function IntakeForm({
  fieldLabels,
  data,
  onChange,
}: {
  fieldLabels: string[];
  data: DocumentFields;
  onChange: (label: string, value: string) => void;
}) {
  return (
    <form className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
      {fieldLabels.map((label) => (
        <label key={label} className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {label}
          </span>
          <input
            type="text"
            value={data[label] ?? ""}
            onChange={(event) => onChange(label, event.target.value)}
            className="w-full border-0 border-b border-pad-line bg-transparent px-0 py-1.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-stamp focus:outline-none"
          />
        </label>
      ))}
    </form>
  );
}
