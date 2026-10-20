import { categories, type Category } from "../schemas.ts";

// What a Markdown file says about itself in its front matter. Agents write this instead of describing files through a
// tool, so it is read on every capture and wins over anything recorded earlier.
export type FrontMatter = {
  readonly title: string | null;
  readonly description: string | null;
  readonly category: Category | null;
};

const block = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const field = /^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$/;

function unquoted(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed.at(0);

  return trimmed.length >= 2 && (quote === '"' || quote === "'") && trimmed.at(-1) === quote ? trimmed.slice(1, -1) : trimmed;
}

function isCategory(value: string): value is Category {
  return categories.some((category) => category === value);
}

// Reads the simple key: value lines Cairn uses. Other keys, nested values, and an unknown category are left alone, so
// front matter written for another tool doesn't fail the capture. Returns null when the text has no front matter.
export function readFrontMatter(text: string): FrontMatter | null {
  const lines = block.exec(text)?.[1];

  if (lines === undefined) {
    return null;
  }

  const values = new Map<string, string>();

  for (const line of lines.split(/\r?\n/)) {
    const match = field.exec(line);

    if (match?.[1] !== undefined && match[2] !== undefined) {
      values.set(match[1].toLowerCase(), unquoted(match[2]));
    }
  }

  const given = (key: string): string | null => {
    const value = values.get(key);

    return value === undefined || value === "" ? null : value;
  };

  const category = given("category");

  return { title: given("title"), description: given("description"), category: category !== null && isCategory(category) ? category : null };
}

// The text after a leading front matter block.
export function withoutFrontMatter(text: string): string {
  return text.replace(block, "");
}

export function hasFrontMatter(text: string): boolean {
  return block.test(text);
}

// Front matter Cairn writes for a file it saves, such as a subagent's result that didn't describe itself.
export function frontMatterBlock(fields: { readonly title: string; readonly category: Category }): string {
  const title = /^[\w .,()/-]*$/.test(fields.title) ? fields.title : JSON.stringify(fields.title);

  return `---\ntitle: ${title}\ncategory: ${fields.category}\n---\n\n`;
}
