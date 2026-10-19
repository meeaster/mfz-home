import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Layout } from "./root.ts";

// The knowledge base is plain files in the format the knowledge-base skill defines. Cairn reads it and keeps none
// of it in the catalog: articles, their references, the sources and evidence they cite, and origins.md.

export type KnowledgeReference = {
  readonly origin: string;
  readonly locator: string;
  readonly sections: readonly string[];
  readonly observed: string | null;
  readonly version: string | null;
  // The evidence file that observed it, when the line names one.
  readonly via: string | null;
};

export type KnowledgeArticle = {
  readonly path: string;
  readonly title: string;
  readonly description: string | null;
  readonly updated: string | null;
  readonly references: readonly KnowledgeReference[];
  // Sources and evidence the References list cites, as absolute paths.
  readonly cites: readonly string[];
};

export type KnowledgeOrigin = {
  readonly key: string;
  readonly kind: string;
  readonly identifier: string;
  readonly description: string;
  readonly access: readonly string[];
};

export type KnowledgeEvidence = {
  readonly path: string;
  // Where it was copied from, as its front matter's from: line names it, or null.
  readonly from: string | null;
};

export type KnowledgeBase = {
  readonly folder: string;
  readonly articles: readonly KnowledgeArticle[];
  readonly origins: readonly KnowledgeOrigin[];
  readonly evidence: readonly KnowledgeEvidence[];
};

type Parsed = {
  readonly meta: ReadonlyMap<string, string>;
  readonly body: readonly string[];
};

const link = /\[[^\]]*\]\(([^)\s]+)\)/;

function markdownFiles(folder: string): string[] {
  if (!existsSync(folder)) {
    return [];
  }

  const found: string[] = [];

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);

    if (entry.isDirectory()) {
      found.push(...markdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(path);
    }
  }

  return found.sort();
}

function parse(text: string): Parsed {
  const lines = text.split(/\r?\n/);
  const meta = new Map<string, string>();

  if (lines[0]?.trim() !== "---") {
    return { meta, body: lines };
  }

  const end = lines.indexOf("---", 1);

  if (end === -1) {
    return { meta, body: lines };
  }

  for (const line of lines.slice(1, end)) {
    const colon = line.indexOf(":");

    if (colon > 0) {
      meta.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    }
  }

  return { meta, body: lines.slice(end + 1) };
}

// The lines under a ## heading, up to the next heading of level one or two.
function section(body: readonly string[], title: string): string[] {
  const start = body.findIndex((line) => /^##\s+/.test(line) && line.replace(/^##\s+/, "").trim() === title);

  if (start === -1) {
    return [];
  }

  const rest = body.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2}\s+/.test(line));

  return end === -1 ? rest : rest.slice(0, end);
}

function linkTarget(part: string, from: string): string | null {
  const target = link.exec(part)?.[1];

  return target === undefined ? null : resolve(dirname(from), target.split("#")[0] ?? target);
}

function originReference(parts: readonly string[], key: string, from: string): KnowledgeReference {
  const named = (prefix: string): string | null => {
    const part = parts.find((candidate) => candidate.startsWith(prefix));

    return part === undefined ? null : part.slice(prefix.length).trim();
  };

  const supports = named("supports:");
  const via = parts.find((part) => part.startsWith("via "));

  return {
    origin: key,
    locator: parts[1] ?? "",
    sections: supports === null ? [] : supports.split(";").map((name) => name.trim()).filter((name) => name !== ""),
    observed: named("observed "),
    version: named("version "),
    via: via === undefined ? null : linkTarget(via, from)
  };
}

function readArticle(path: string): KnowledgeArticle {
  const { meta, body } = parse(readFileSync(path, "utf8"));
  const references: KnowledgeReference[] = [];
  const cites: string[] = [];

  for (const line of section(body, "References")) {
    if (!line.startsWith("- ")) {
      continue;
    }

    const parts = line.slice(2).split(" · ").map((part) => part.trim());
    const key = /^`([^`]+)`$/.exec(parts[0] ?? "")?.[1];

    if (key === undefined) {
      const target = linkTarget(parts[0] ?? "", path);

      if (target !== null) {
        cites.push(target);
      }

      continue;
    }

    const reference = originReference(parts, key, path);

    references.push(reference);

    if (reference.via !== null) {
      cites.push(reference.via);
    }
  }

  const heading = body.find((line) => /^#\s+/.test(line));

  return {
    path,
    title: heading === undefined ? path.slice(path.lastIndexOf("/") + 1, -3) : heading.replace(/^#\s+/, "").trim(),
    description: meta.get("description") ?? null,
    updated: meta.get("updated") ?? null,
    references,
    cites: [...new Set(cites)]
  };
}

function readOrigins(path: string): KnowledgeOrigin[] {
  if (!existsSync(path)) {
    return [];
  }

  const origins: KnowledgeOrigin[] = [];
  let current: { key: string; lines: string[] } | null = null;

  const finish = (): void => {
    if (current === null) {
      return;
    }

    const separator = current.key.indexOf(":");
    const access: string[] = [];
    const description: string[] = [];
    let listing = false;

    // "- Access: <method>" lines, or an "Access:" line followed by a list of methods.
    for (const line of current.lines) {
      const method = /^-?\s*access:\s*(.*)$/i.exec(line)?.[1];

      if (method !== undefined) {
        listing = method === "";

        if (!listing) {
          access.push(method);
        }
      } else if (listing && line.startsWith("- ")) {
        access.push(line.slice(2).trim());
      } else {
        listing = false;
        description.push(line);
      }
    }

    origins.push({ key: current.key, kind: current.key.slice(0, separator), identifier: current.key.slice(separator + 1), description: description.join(" "), access });
  };

  for (const line of parse(readFileSync(path, "utf8")).body) {
    const heading = /^##\s+`?([a-z][a-z0-9-]*:\S+?)`?\s*$/.exec(line);

    if (heading?.[1] !== undefined) {
      finish();
      current = { key: heading[1], lines: [] };
    } else if (current !== null && line.trim() !== "") {
      current.lines.push(line.trim());
    }
  }

  finish();

  return origins;
}

// The knowledge base at the layout's knowledge folder, or null when there is none yet.
export function readKnowledgeBase(layout: Layout): KnowledgeBase | null {
  const folder = layout.knowledge;

  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    return null;
  }

  return {
    folder,
    articles: markdownFiles(join(folder, "articles")).map(readArticle),
    origins: readOrigins(join(folder, "origins.md")),
    evidence: markdownFiles(join(folder, "evidence")).map((path) => ({ path, from: parse(readFileSync(path, "utf8")).meta.get("from") ?? null }))
  };
}

// The articles that cite a file: directly, through a reference's evidence, or through evidence copied from it.
export function citingArticles(base: KnowledgeBase | null, path: string): KnowledgeArticle[] {
  if (base === null) {
    return [];
  }

  const copies = base.evidence.filter((evidence) => evidence.from?.split(" · ").some((part) => resolve(part.trim()) === path) === true);
  const cited = new Set([path, ...copies.map((evidence) => evidence.path)]);

  return base.articles.filter((article) => article.cites.some((target) => cited.has(target)));
}
