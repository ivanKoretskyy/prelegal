import { describe, expect, it } from "vitest";
import { parseTemplateBody, tokenizeInline } from "./document-template";

describe("tokenizeInline", () => {
  it("splits plain text, markdown bold, and blanks", () => {
    const tokens = tokenizeInline(
      'Each **party** must protect the <span class="coverpage_link">Purpose</span>.'
    );

    expect(tokens).toEqual([
      { type: "text", value: "Each " },
      { type: "bold", tokens: [{ type: "text", value: "party" }] },
      { type: "text", value: " must protect the " },
      { type: "blank", label: "Purpose" },
      { type: "text", value: "." },
    ]);
  });

  it("recursively tokenizes a blank nested inside bold markdown", () => {
    const tokens = tokenizeInline(
      '**Cap of <span class="keyterms_link">General Cap Amount</span> applies.**'
    );

    expect(tokens).toEqual([
      {
        type: "bold",
        tokens: [
          { type: "text", value: "Cap of " },
          { type: "blank", label: "General Cap Amount" },
          { type: "text", value: " applies." },
        ],
      },
    ]);
  });

  it("treats header_2/header_3 spans as bold", () => {
    const tokens = tokenizeInline('<span class="header_3" id="1.1">Access and Use.</span>');

    expect(tokens).toEqual([
      { type: "bold", tokens: [{ type: "text", value: "Access and Use." }] },
    ]);
  });

  it("discards a self-closing bare anchor span", () => {
    const tokens = tokenizeInline('<span id="4.1"></span>Some text.');

    expect(tokens).toEqual([{ type: "text", value: "Some text." }]);
  });

  it("discards a bare anchor span that wraps other markup instead of leaking its tags", () => {
    const tokens = tokenizeInline('<span id="13.9">**"Cover Page"**</span> means...');

    expect(tokens).toEqual([
      { type: "bold", tokens: [{ type: "text", value: '"Cover Page"' }] },
      { type: "text", value: " means..." },
    ]);
  });

  it("parses markdown links", () => {
    const tokens = tokenizeInline("free to use under [CC BY 4.0](https://example.com/license).");

    expect(tokens).toEqual([
      { type: "text", value: "free to use under " },
      { type: "link", text: "CC BY 4.0", url: "https://example.com/license" },
      { type: "text", value: "." },
    ]);
  });
});

describe("parseTemplateBody", () => {
  it("skips the title line and assigns markers/depth from indentation", () => {
    const items = parseTemplateBody(
      [
        "# Mutual Non-Disclosure Agreement",
        "",
        "1. **Introduction**. Some text.",
        "    1. **Sub point.** More text.",
        "        a. Even deeper.",
        "            i. Deepest.",
      ].join("\n")
    );

    expect(items.map((item) => [item.marker, item.depth])).toEqual([
      ["1.", 0],
      ["1.", 1],
      ["a.", 2],
      ["i.", 3],
    ]);
  });

  it("falls back to depth 0 with no marker for an unmarked line", () => {
    const items = parseTemplateBody("Common Paper Mutual NDA, free to use under CC BY 4.0.");

    expect(items).toEqual([
      {
        marker: "",
        depth: 0,
        tokens: [{ type: "text", value: "Common Paper Mutual NDA, free to use under CC BY 4.0." }],
      },
    ]);
  });

  it("skips blank lines", () => {
    const items = parseTemplateBody(["1. First item.", "", "2. Second item."].join("\n"));

    expect(items).toHaveLength(2);
  });
});
