import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTemplateBody, type InlineToken } from "./document-template";

// Exercises the parser against the real templates/ directory (not fixtures) so
// a change to either the parser or a template's markup gets caught here.
const TEMPLATES_DIR = path.resolve(__dirname, "../../../templates");
const CATALOG_PATH = path.resolve(__dirname, "../../../catalog.json");

const catalog: { name: string; filename: string }[] = JSON.parse(readFileSync(CATALOG_PATH, "utf-8"));

// Known-good distinct field counts, cross-checked against the backend's
// independent regex-based extraction (backend/tests/test_templates.py).
const EXPECTED_FIELD_COUNTS: Record<string, number> = {
  "Mutual-NDA.md": 6,
  "CSA.md": 24,
  "Design-Partner-Agreement.md": 11,
  "SLA.md": 11,
  "PSA.md": 29,
  "DPA.md": 16,
  "Software-License-Agreement.md": 25,
  "Partnership-Agreement.md": 20,
  "Pilot-Agreement.md": 10,
  "BAA.md": 8,
  "AI-Addendum.md": 8,
};

function collectText(tokens: InlineToken[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") return token.value;
      if (token.type === "bold") return collectText(token.tokens);
      if (token.type === "link") return token.text;
      return "";
    })
    .join("");
}

function collectBlankLabels(tokens: InlineToken[], into: Set<string>) {
  for (const token of tokens) {
    if (token.type === "blank") into.add(token.label);
    if (token.type === "bold") collectBlankLabels(token.tokens, into);
  }
}

describe("parseTemplateBody against the real templates directory", () => {
  it("covers every catalog entry", () => {
    expect(catalog.length).toBe(11);
  });

  it.each(catalog)("$filename parses with no leftover markup and the expected field count", (entry) => {
    const content = readFileSync(path.join(TEMPLATES_DIR, entry.filename), "utf-8");
    const items = parseTemplateBody(content);

    const renderedText = items.map((item) => collectText(item.tokens)).join("\n");
    expect(renderedText).not.toContain("<span");
    expect(renderedText).not.toContain("</span>");
    expect(renderedText).not.toContain("**");

    const blanks = new Set<string>();
    for (const item of items) collectBlankLabels(item.tokens, blanks);
    expect(blanks.size).toBe(EXPECTED_FIELD_COUNTS[entry.filename]);
  });
});
