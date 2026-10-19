import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import { move } from "./artifacts.ts";
import { integer, optionalText, text, transaction, type Cairn } from "./db.ts";
import { absolutePath } from "./root.ts";

// Before the knowledge base kept everything in its files, an article's description, origins and references were
// catalog rows. Export writes them into the knowledge base once, moves articles into articles/, and empties the
// tables, which Cairn no longer reads.

export type ExportResult = {
  readonly origins: number;
  readonly articles: readonly { readonly path: string; readonly references: number }[];
  // Articles the catalog records that export couldn't write, with why.
  readonly skipped: readonly { readonly path: string; readonly reason: string }[];
};

type CatalogArticle = {
  readonly id: number;
  readonly path: string;
  readonly description: string | null;
  readonly updated: string;
};

const sectionList = z.array(z.string());

// The origins.md sections for every catalog origin the file doesn't have yet.
function originSections(cairn: Cairn, existing: string): string[] {
  const sections: string[] = [];

  for (const row of cairn.sql.all`
    SELECT origin.id, origin_kind.name AS kind, origin.identifier, origin.title, origin.description
    FROM origin JOIN origin_kind ON origin_kind.id = origin.kind_id
    ORDER BY origin_kind.name, origin.identifier
  `) {
    const key = `${text(row, "kind")}:${text(row, "identifier")}`;

    if (existing.includes(`## ${key}\n`)) {
      continue;
    }

    const description = text(row, "description");
    const lines = [`## ${key}`, "", description === "" ? text(row, "title") : `${text(row, "title")}. ${description}`];

    for (const access of cairn.sql.all`SELECT method, detail FROM origin_access WHERE origin_id = ${integer(row, "id")} ORDER BY method, detail`) {
      const detail = text(access, "detail");

      lines.push(`- Access: ${text(access, "method")}${detail === "" ? "" : ` ${detail}`}`);
    }

    sections.push(lines.join("\n"));
  }

  return sections;
}

function referenceLines(cairn: Cairn, articleId: number): string[] {
  const lines: string[] = [];

  for (const row of cairn.sql.all`
    SELECT origin_kind.name AS kind, origin.identifier, origin_reference.locator, origin_reference.sections,
      origin_reference.observed_at, origin_reference.version
    FROM origin_reference
    JOIN origin ON origin.id = origin_reference.origin_id
    JOIN origin_kind ON origin_kind.id = origin.kind_id
    WHERE origin_reference.artifact_id = ${articleId}
    ORDER BY origin_reference.observed_at, origin_reference.id
  `) {
    const parts = [`\`${text(row, "kind")}:${text(row, "identifier")}\``, text(row, "locator"), `observed ${text(row, "observed_at").slice(0, 10)}`];
    const version = optionalText(row, "version");
    const sections = sectionList.parse(JSON.parse(text(row, "sections")));

    if (version !== null) {
      parts.push(`version ${version}`);
    }

    if (sections.length > 0) {
      parts.push(`supports: ${sections.join("; ")}`);
    }

    lines.push(`- ${parts.join(" · ")}`);
  }

  return lines;
}

// Adds description and updated to the front matter when the file lacks them, and the reference lines to its
// References section, starting one at the end when it has none.
function withKnowledge(content: string, article: CatalogArticle, references: readonly string[]): string {
  let body = content;
  let meta: string[] = [];

  if (content.startsWith("---\n")) {
    const end = content.indexOf("\n---\n", 4);

    if (end !== -1) {
      meta = content.slice(4, end).split("\n");
      body = content.slice(end + 5);
    }
  }

  const has = (key: string): boolean => meta.some((line) => line.startsWith(`${key}:`));

  if (!has("description") && article.description !== null) {
    meta.push(`description: ${article.description.replaceAll("\n", " ")}`);
  }

  if (!has("updated")) {
    meta.push(`updated: ${article.updated.slice(0, 10)}`);
  }

  const fresh = references.filter((line) => !body.includes(line));

  if (fresh.length > 0) {
    body = /^## References\s*$/m.test(body) ? `${body.trimEnd()}\n${fresh.join("\n")}\n` : `${body.trimEnd()}\n\n## References\n\n${fresh.join("\n")}\n`;
  }

  return `---\n${meta.join("\n")}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`;
}

function catalogArticles(cairn: Cairn): CatalogArticle[] {
  const articles: CatalogArticle[] = [];

  for (const row of cairn.sql.all`
    SELECT id, location, path_or_url, description, updated_at FROM artifact
    WHERE category = 'knowledge' AND status != 'archived' AND location != 'url'
    ORDER BY path_or_url
  `) {
    articles.push({
      id: integer(row, "id"),
      path: absolutePath(cairn, text(row, "location") === "managed" ? "managed" : "external", text(row, "path_or_url")),
      description: optionalText(row, "description"),
      updated: text(row, "updated_at")
    });
  }

  return articles;
}

export function exportKnowledge(cairn: Cairn): ExportResult {
  const origins = join(cairn.knowledge, "origins.md");
  const existing = existsSync(origins) ? readFileSync(origins, "utf8") : "# Origins\n\nThe systems this knowledge base's claims come from, and how to reach each.\n";
  const added = originSections(cairn, existing);
  const written: { path: string; references: number }[] = [];
  const skipped: { path: string; reason: string }[] = [];

  for (const article of catalogArticles(cairn)) {
    if (!existsSync(article.path)) {
      skipped.push({ path: article.path, reason: "the file no longer exists" });
      continue;
    }

    const references = referenceLines(cairn, article.id);

    writeFileSync(article.path, withKnowledge(readFileSync(article.path, "utf8"), article, references));

    // Articles sat directly in knowledge/; the knowledge base keeps them in articles/.
    const target = join(cairn.knowledge, "articles", basename(article.path));
    const flat = dirname(article.path) === cairn.knowledge;

    if (flat && !existsSync(target)) {
      move(cairn, { artifact: article.path, to: target });
    } else if (flat) {
      skipped.push({ path: article.path, reason: `left in place: ${target} already exists` });
    }

    written.push({ path: flat && !existsSync(article.path) ? target : article.path, references: references.length });
  }

  if (added.length > 0) {
    writeFileSync(origins, `${existing.trimEnd()}\n\n${added.join("\n\n")}\n`);
  }

  transaction(cairn, () => {
    cairn.sql.run`DELETE FROM origin_reference`;
    cairn.sql.run`DELETE FROM origin_access`;
    cairn.sql.run`DELETE FROM origin`;
    cairn.sql.run`DELETE FROM origin_kind`;
  });

  return { origins: added.length, articles: written, skipped };
}
