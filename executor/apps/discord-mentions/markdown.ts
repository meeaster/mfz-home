// Fits OpenCode's Markdown to what Discord renders, in messages within Discord's length limit.

export const messageLimit = 2000;

const fence = /^\s*(```|~~~)(.*)$/;
const tableSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

// Discord has no tables, headings deeper than ###, or rules; outside code blocks, rewrite them.
export function toDiscordMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inCode = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (fence.test(line)) inCode = !inCode;

    if (inCode || fence.test(line)) {
      out.push(line);
      continue;
    }

    const next = lines[index + 1];

    // A header row followed by its separator row starts a table: each body row becomes a bullet.
    if (line.trim().startsWith("|") && next !== undefined && tableSeparator.test(next)) {
      index += 1;

      while (lines[index + 1]?.trim().startsWith("|")) {
        index += 1;
        const [first = "", ...rest] = cells(lines[index] ?? "");
        out.push(rest.length === 0 ? `- ${first}` : `- ${first}: ${rest.filter(Boolean).join(" — ")}`);
      }

      continue;
    }

    const heading = /^\s*#{4,}\s+(.*)$/.exec(line);

    if (heading) {
      out.push(`**${heading[1] ?? ""}**`);
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) continue;

    out.push(line);
  }

  return out.join("\n");
}

// Splits at paragraph or line breaks, never mid-word unless one line is too long. A split inside a
// code block closes the block and reopens it with the same language in the next message.
export function splitForDiscord(text: string, limit = messageLimit): string[] {
  const chunks: string[] = [];
  let current = "";
  // The open code block's marker and its full opening line, while inside one.
  let openFence: { readonly marker: string; readonly opening: string } | undefined;

  const flush = () => {
    if (current.trim() === "") return;

    chunks.push(
      openFence === undefined ? current.trimEnd() : `${current.trimEnd()}\n${openFence.marker}`,
    );
    current = openFence === undefined ? "" : `${openFence.opening}\n`;
  };

  for (const line of text.split("\n")) {
    // Room for the newline and a closing fence if this chunk ends inside a code block.
    const reserve = openFence === undefined ? 1 : 5;

    if (current.length + line.length + reserve > limit) flush();

    // A single line longer than a message is cut at the last space that fits.
    let rest = line;

    while (current.length + rest.length + reserve > limit) {
      const room = limit - current.length - reserve;
      const cut = rest.lastIndexOf(" ", room) > room / 2 ? rest.lastIndexOf(" ", room) : room;

      current += rest.slice(0, cut);
      rest = rest.slice(cut).trimStart();
      flush();
    }

    current += `${rest}\n`;

    const marker = fence.exec(line);

    if (marker) {
      const symbol = marker[1] ?? "```";

      openFence =
        openFence === undefined ? { marker: symbol, opening: `${symbol}${marker[2] ?? ""}` } : undefined;
    }
  }

  if (current.trim() !== "") chunks.push(current.trimEnd());

  return chunks;
}
