import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export type RootPaths = {
  readonly root: string;
  readonly database: string;
  readonly backups: string;
  readonly logs: string;
  readonly sessions: string;
  readonly efforts: string;
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

export function rootPaths(root: string): RootPaths {
  const absolute = resolve(root);

  return {
    root: absolute,
    database: join(absolute, "catalog.db"),
    backups: join(absolute, "backups"),
    logs: join(absolute, "logs"),
    sessions: join(absolute, "sessions"),
    efforts: join(absolute, "efforts")
  };
}

// The records an agent keeps in each effort's folder.
export const recordNames: readonly string[] = ["context.md", "design.md"];

export function effortFolder(root: string, slug: string): string {
  return join(root, "efforts", slug);
}

export function sessionFolder(root: string, harness: string, month: string, rootNativeId: string): string {
  return join(root, "sessions", safeSegment(harness), month, safeSegment(rootNativeId));
}

export function safeSegment(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9._-]/g, "_");
}

export function relativeInsideRoot(root: string, absolute: string): string | null {
  const inside = relative(root, absolute);

  if (inside === "" || inside.startsWith("..") || isAbsolute(inside)) {
    return null;
  }

  return inside.split(sep).join("/");
}

export function storedPath(root: string, absolute: string): StoredPath {
  const inside = relativeInsideRoot(root, absolute);

  if (inside === null) {
    return { location: "external", stored: absolute };
  }

  return { location: "managed", stored: inside };
}

export function absolutePath(root: string, location: "managed" | "external", stored: string): string {
  return location === "managed" ? join(root, stored) : stored;
}

// Cairn's own files are never captured as artifacts.
export function isCairnOwned(inside: string): boolean {
  return (
    inside === "catalog.db" ||
    inside.startsWith("catalog.db-") ||
    inside.startsWith("backups/") ||
    inside.startsWith("logs/") ||
    /^efforts\/[^/]+\/index\.md$/.test(inside)
  );
}

export function isEffortRecord(inside: string): boolean {
  const match = /^efforts\/[^/]+\/([^/]+)$/.exec(inside);

  return match?.[1] !== undefined && recordNames.includes(match[1]);
}
