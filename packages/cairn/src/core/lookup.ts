import { resolve } from "node:path";
import { formatSessionKey, type SessionKey } from "../schemas.ts";
import { CairnError, integer, type Cairn } from "./db.ts";
import { storedPath } from "./root.ts";

export function findSessionId(cairn: Cairn, key: SessionKey): number | undefined {
  const row = cairn.sql.get`SELECT id FROM session WHERE harness = ${key.harness} AND native_id = ${key.nativeId}`;

  return row === undefined ? undefined : integer(row, "id");
}

export function requireSessionId(cairn: Cairn, key: SessionKey): number {
  const id = findSessionId(cairn, key);

  if (id === undefined) {
    throw new CairnError("not_found", `No session ${formatSessionKey(key)}`);
  }

  return id;
}

export function findEffortId(cairn: Cairn, slug: string): number | undefined {
  const row = cairn.sql.get`SELECT id FROM effort WHERE slug = ${slug}`;

  return row === undefined ? undefined : integer(row, "id");
}

export function requireEffortId(cairn: Cairn, slug: string): number {
  const id = findEffortId(cairn, slug);

  if (id === undefined) {
    throw new CairnError("not_found", `No effort ${slug}`);
  }

  return id;
}

export function isUrl(reference: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(reference);
}

// The stored form of an artifact reference: a URL as given, a root-relative path, or an absolute external path.
export function storedReference(cairn: Cairn, reference: string): string {
  if (isUrl(reference)) {
    return reference;
  }

  return storedPath(cairn.root, resolve(reference)).stored;
}

export function findArtifactId(cairn: Cairn, reference: string): number | undefined {
  const row = cairn.sql.get`SELECT id FROM artifact WHERE path_or_url = ${storedReference(cairn, reference)}`;

  return row === undefined ? undefined : integer(row, "id");
}

export function requireArtifactId(cairn: Cairn, reference: string): number {
  const id = findArtifactId(cairn, reference);

  if (id === undefined) {
    throw new CairnError("not_found", `No artifact ${reference}`);
  }

  return id;
}
