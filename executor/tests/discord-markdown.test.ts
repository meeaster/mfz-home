import { describe, expect, it } from "vitest";
import {
  messageLimit,
  splitForDiscord,
  toDiscordMarkdown,
} from "../apps/discord-mentions/markdown.ts";

const table = [
  "## Layout",
  "| Folder | Contents |",
  "|---|---|",
  "| `repos/` | 24 project repositories |",
  "| `scratch/` | Temporary work, by month |",
  "",
  "#### Details",
  "---",
  "Done.",
].join("\n");

describe("toDiscordMarkdown", () => {
  it("turns tables into bullets, deep headings into bold, and drops rules", () => {
    expect(toDiscordMarkdown(table)).toBe(
      [
        "## Layout",
        "- `repos/`: 24 project repositories",
        "- `scratch/`: Temporary work, by month",
        "",
        "**Details**",
        "Done.",
      ].join("\n"),
    );
  });

  it("leaves code blocks alone", () => {
    const code = "```md\n| a | b |\n|---|---|\n#### not a heading\n```";

    expect(toDiscordMarkdown(code)).toBe(code);
  });
});

describe("splitForDiscord", () => {
  it("splits long replies at line breaks within the limit", () => {
    const text = Array.from({ length: 80 }, (_, index) => `- **Item ${index}:** ${"word ".repeat(7)}word`).join("\n");
    const chunks = splitForDiscord(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= messageLimit)).toBe(true);
    // Every split falls on a line break, so no bold run or word is cut.
    expect(chunks.join("\n")).toBe(text);
  });

  it("closes and reopens a code block that crosses a split", () => {
    const code = ["```ts", ...Array.from({ length: 120 }, (_, index) => `const value${index} = ${index};`), "```"].join("\n");
    const chunks = splitForDiscord(code, 500);

    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
      expect(chunk.startsWith("```ts")).toBe(true);
      expect(chunk.trimEnd().endsWith("```")).toBe(true);
    }
  });
});
