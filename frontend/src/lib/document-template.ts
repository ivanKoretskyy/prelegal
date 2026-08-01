export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; tokens: InlineToken[] }
  | { type: "blank"; label: string }
  | { type: "link"; text: string; url: string };

export type ListItem = {
  marker: string;
  depth: number;
  tokens: InlineToken[];
};

// A bare `<span id="...">` — sometimes self-closing, sometimes wrapping other
// markup (e.g. `<span id="13.9">**"Cover Page"**</span>`) — carries no visual
// meaning. Matching its open and close tags as separate, non-emitting
// alternatives lets whatever's between them fall through to the other rules
// in the same left-to-right scan, rather than leaking as literal text.
const INLINE_PATTERN =
  /\*\*([^*]+)\*\*|<span class="header_[23]"[^>]*>([^<]*)<\/span>|<span class="[a-z]+_link"[^>]*>([^<]+)<\/span>|<span id="[^"]*">|<\/span>|\[([^\]]+)\]\(([^)]+)\)/g;

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const [full, boldMarkdown, boldSpan, blankLabel, linkText, linkUrl] = match;
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, matchIndex) });
    }

    if (boldMarkdown !== undefined) {
      tokens.push({ type: "bold", tokens: tokenizeInline(boldMarkdown) });
    } else if (boldSpan !== undefined) {
      tokens.push({ type: "bold", tokens: tokenizeInline(boldSpan) });
    } else if (blankLabel !== undefined) {
      tokens.push({ type: "blank", label: blankLabel.trim() });
    } else if (linkText !== undefined) {
      tokens.push({ type: "link", text: linkText, url: linkUrl });
    }
    // A bare anchor span (`<span id="...">`) matches but produces no token.

    lastIndex = matchIndex + full.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

const LINE_PATTERN = /^( *)(\d+\.|[a-z]\.|[ivxlcdm]+\.)\s+(.*)$/;

export function parseTemplateBody(content: string): ListItem[] {
  const items: ListItem[] = [];

  for (const rawLine of content.split("\n")) {
    if (!rawLine.trim() || rawLine.startsWith("# ")) continue;

    const match = rawLine.match(LINE_PATTERN);
    if (!match) {
      items.push({ marker: "", depth: 0, tokens: tokenizeInline(rawLine.trim()) });
      continue;
    }

    const [, indent, marker, rest] = match;
    items.push({ marker, depth: Math.floor(indent.length / 4), tokens: tokenizeInline(rest) });
  }

  return items;
}
