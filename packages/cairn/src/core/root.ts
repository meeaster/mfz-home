import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";

// Where Cairn keeps its state, and the two content folders it tracks. Content can live outside the root, such
// as in a git repository, and is stored in the catalog as if mounted at knowledge/ and designs/ under the root, so
// a catalog path stays the same wherever the folder moves.
export type Layout = {
  readonly root: string;
  readonly knowledge: string;
  readonly designs: string;
};

type Mount = "knowledge" | "designs";

const mounts: readonly Mount[] = ["knowledge", "designs"];

const configFile = z.object({
  knowledge: z.string().min(1).optional(),
  designs: z.string().min(1).optional()
});

type ConfigFile = z.output<typeof configFile>;

export type RootPaths = {
  readonly root: string;
  readonly database: string;
  readonly backups: string;
  readonly logs: string;
  readonly sessions: string;
  readonly efforts: string;
  // The models.dev catalog that prices model usage, refreshed daily.
  readonly pricing: string;
  // Model names a harness records, mapped to the models.dev models that price them.
  readonly aliases: string;
};

export type StoredPath = {
  readonly location: "managed" | "external";
  readonly stored: string;
};

export function resolveRoot(configured: string | undefined): string {
  if (configured !== undefined && configured !== "") {
    return resolve(configured);
  }

  return join(homedir(), "workspace", "artifacts", "cairn");
}

function expandHome(path: string, home: string): string {
  return path === "~" || path.startsWith("~/") ? join(home, path.slice(1)) : path;
}

function configured(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

// The config file is optional; one that exists but can't be read as Cairn's is an error worth seeing.
function readConfig(path: string): ConfigFile {
  if (!existsSync(path)) {
    return {};
  }

  const parsed = configFile.safeParse(JSON.parse(readFileSync(path, "utf8")));

  if (!parsed.success) {
    throw new Error(`${path} must hold {"knowledge": "<folder>", "designs": "<folder>"}, both optional`);
  }

  return parsed.data;
}

// Each folder comes from its environment variable, then the config file, then a folder of that name in the root.
export function resolveLayout(env: Readonly<Record<string, string | undefined>>, home: string = homedir()): Layout {
  const root = resolveRoot(env.CAIRN_ROOT);
  const configHome = configured(env.XDG_CONFIG_HOME) ?? join(home, ".config");
  const config = readConfig(join(configHome, "cairn", "config.json"));

  const folder = (variable: string | undefined, fromConfig: string | undefined, name: Mount): string => {
    const chosen = configured(variable) ?? fromConfig;

    return chosen === undefined ? join(root, name) : resolve(expandHome(chosen, home));
  };

  return {
    root,
    knowledge: folder(env.CAIRN_KNOWLEDGE, config.knowledge, "knowledge"),
    designs: folder(env.CAIRN_DESIGNS, config.designs, "designs")
  };
}

export function layoutAt(root: string): Layout {
  const absolute = resolve(root);

  return { root: absolute, knowledge: join(absolute, "knowledge"), designs: join(absolute, "designs") };
}

// What a session is told about where content lives. The knowledge base is named only once it has its AGENTS.md.
export function contentNote(layout: Layout): string {
  const lines = [`Designs live in ${layout.designs}/<slug>/.`];

  if (existsSync(join(layout.knowledge, "AGENTS.md"))) {
    lines.unshift(`The knowledge base is at ${layout.knowledge}; read its AGENTS.md before looking things up there or changing it.`);
  }

  return lines.join(" ");
}

export function rootPaths(root: string): RootPaths {
  const absolute = resolve(root);

  return {
    root: absolute,
    database: join(absolute, "catalog.db"),
    backups: join(absolute, "backups"),
    logs: join(absolute, "logs"),
    sessions: join(absolute, "sessions"),
    efforts: join(absolute, "efforts"),
    pricing: join(absolute, "pricing", "models-dev.json"),
    aliases: join(absolute, "pricing", "aliases.json")
  };
}

// The records an agent keeps in each effort's folder: effort.md, and design.md for a design local to the effort.
// context.md and approach.md are their earlier names, still read until an effort's records are renamed.
export const recordNames: readonly string[] = ["effort.md", "design.md", "context.md", "approach.md"];

export function effortFolder(root: string, slug: string): string {
  return join(root, "efforts", slug);
}

// A stable design's record: designs/<slug>/design.json in the designs folder, or design.md before format 3.
export function isStableDesign(layout: Layout, path: string): boolean {
  return /^[^/]+\/design\.(json|md)$/.test(relative(layout.designs, path));
}

export function sessionFolder(root: string, harness: string, month: string, rootNativeId: string): string {
  return join(root, "sessions", safeSegment(harness), month, safeSegment(rootNativeId));
}

export function safeSegment(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9._-]/g, "_");
}

function inside(folder: string, absolute: string): string | null {
  const path = relative(folder, absolute);

  if (path.startsWith("..") || isAbsolute(path)) {
    return null;
  }

  return path.split(sep).join("/");
}

// A content folder kept outside the root replaces the root's folder of that name.
function movedMount(layout: Layout, mount: Mount): boolean {
  return resolve(layout[mount]) !== join(resolve(layout.root), mount);
}

// The catalog path of a file Cairn manages: relative to the root, with content folders as if mounted under it.
export function relativeInsideRoot(layout: Layout, absolute: string): string | null {
  for (const mount of mounts) {
    if (!movedMount(layout, mount)) {
      continue;
    }

    const path = inside(layout[mount], absolute);

    if (path !== null) {
      return path === "" ? mount : `${mount}/${path}`;
    }
  }

  const path = inside(layout.root, absolute);

  if (path === null || path === "") {
    return null;
  }

  const shadowed = mounts.some((mount) => movedMount(layout, mount) && (path === mount || path.startsWith(`${mount}/`)));

  return shadowed ? null : path;
}

export function storedPath(layout: Layout, absolute: string): StoredPath {
  const path = relativeInsideRoot(layout, absolute);

  if (path === null) {
    return { location: "external", stored: absolute };
  }

  return { location: "managed", stored: path };
}

export function absolutePath(layout: Layout, location: "managed" | "external", stored: string): string {
  if (location === "external") {
    return stored;
  }

  for (const mount of mounts) {
    if (stored === mount || stored.startsWith(`${mount}/`)) {
      return join(layout[mount], stored.slice(mount.length + 1));
    }
  }

  return join(layout.root, stored);
}

// A knowledge base file describes itself in its front matter, so capture files it by the folder it's in rather
// than asking its writer for a description.
export function knowledgeCategory(inside: string): "knowledge" | "source" | "evidence" | null {
  // The knowledge base's own files at its top, AGENTS.md and origins.md, are part of it like its articles.
  if (/^knowledge\/[^/]+\.md$/.test(inside)) {
    return "knowledge";
  }

  const folder = /^knowledge\/(articles|sources|evidence)\//.exec(inside)?.[1];

  switch (folder) {
    case "articles":
      return "knowledge";
    case "sources":
      return "source";
    case "evidence":
      return "evidence";
    default:
      return null;
  }
}

// Cairn's own files are never captured as artifacts.
export function isCairnOwned(inside: string): boolean {
  return (
    inside === ".git" ||
    inside === ".git/" ||
    inside.startsWith(".git/") ||
    inside === "catalog.db" ||
    inside.startsWith("catalog.db-") ||
    inside.startsWith("backups/") ||
    inside.startsWith("logs/") ||
    inside.startsWith("locks/") ||
    inside.startsWith("pricing/") ||
    /^efforts\/[^/]+\/index\.md$/.test(inside)
  );
}

export function isEffortRecord(inside: string): boolean {
  const match = /^efforts\/[^/]+\/([^/]+)$/.exec(inside);

  return match?.[1] !== undefined && recordNames.includes(match[1]);
}
