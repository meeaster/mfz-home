import { readdirSync } from "node:fs";
import { join } from "node:path";
import { integer, optionalText, text, timestamp, transaction, type Cairn } from "./db.ts";
import { fileFacts, recordManagedFile, type FileFacts } from "./artifacts.ts";
import { member } from "./find.ts";
import { absolutePath, isCairnOwned, safeSegment } from "./root.ts";
import { markArtifactDirty } from "./views.ts";

export type CheckReport = {
  readonly missing: readonly string[];
  readonly changed: readonly string[];
  readonly moved: readonly { readonly from: string; readonly to: string }[];
  readonly captured: readonly string[];
};

type Recorded = {
  readonly id: number;
  readonly location: "managed" | "external";
  readonly stored: string;
  readonly sha256: string | null;
  readonly status: string;
};

function walk(root: string, folder = ""): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
    const inside = folder === "" ? entry.name : `${folder}/${entry.name}`;

    if (entry.isDirectory()) {
      if (!isCairnOwned(`${inside}/`)) {
        found.push(...walk(root, inside));
      }
    } else if (entry.isFile() && !isCairnOwned(inside) && !inside.endsWith(".tmp")) {
      found.push(inside);
    }
  }

  return found;
}

function recordedFiles(cairn: Cairn): Recorded[] {
  const recorded: Recorded[] = [];

  for (const row of cairn.sql.all`
    SELECT id, location, path_or_url, sha256, status FROM artifact WHERE location != 'url' AND status != 'archived'
  `) {
    recorded.push({
      id: integer(row, "id"),
      location: member(["managed", "external"], text(row, "location")),
      stored: text(row, "path_or_url"),
      sha256: optionalText(row, "sha256"),
      status: text(row, "status")
    });
  }

  return recorded;
}

// The root session whose folder holds a file, from its sessions/<harness>/<month>/<native-id>/ prefix.
function folderSession(cairn: Cairn, inside: string): number | null {
  const match = /^sessions\/([^/]+)\/\d{4}-\d{2}\/([^/]+)\//.exec(inside);

  if (match === null) {
    return null;
  }

  for (const row of cairn.sql.all`
    SELECT id, native_id FROM session WHERE harness = ${match[1] ?? ""} AND parent_session_id IS NULL
  `) {
    if (safeSegment(text(row, "native_id")) === match[2]) {
      return integer(row, "id");
    }
  }

  return null;
}

// Marks missing and changed files, follows moved files by hash, and records files written outside the harness hooks.
export function check(cairn: Cairn): CheckReport {
  return transaction(cairn, () => {
    const now = timestamp(cairn);
    const onDisk = walk(cairn.root);
    const recorded = recordedFiles(cairn);
    const recordedPaths = new Set<string>();
    const lost: Recorded[] = [];
    const changed: string[] = [];

    for (const file of recorded) {
      const path = absolutePath(cairn.root, file.location, file.stored);
      const facts = fileFacts(path);

      if (file.location === "managed") {
        recordedPaths.add(file.stored);
      }

      if (facts === null) {
        lost.push(file);
        continue;
      }

      if (facts.sha256 !== file.sha256 || file.status === "missing") {
        cairn.sql.run`
          UPDATE artifact SET sha256 = ${facts.sha256}, size = ${facts.size}, updated_at = ${now},
            status = CASE WHEN status = 'missing'
              THEN CASE WHEN category IS NULL THEN 'undescribed' ELSE 'active' END
              ELSE status END
          WHERE id = ${file.id}
        `;
        markArtifactDirty(cairn, file.id);
        changed.push(path);
      }
    }

    const unrecorded = new Map<string, FileFacts>();

    for (const inside of onDisk) {
      if (!recordedPaths.has(inside)) {
        const facts = fileFacts(join(cairn.root, inside));

        if (facts !== null) {
          unrecorded.set(inside, facts);
        }
      }
    }

    const moved: { from: string; to: string }[] = [];
    const missing: string[] = [];

    for (const file of lost) {
      const from = absolutePath(cairn.root, file.location, file.stored);
      const match = [...unrecorded.entries()].find(([, facts]) => facts.sha256 === file.sha256);

      if (match === undefined) {
        if (file.status !== "missing") {
          markArtifactDirty(cairn, file.id);
          cairn.sql.run`UPDATE artifact SET status = 'missing', updated_at = ${now} WHERE id = ${file.id}`;
        }

        missing.push(from);
        continue;
      }

      const [inside] = match;

      unrecorded.delete(inside);
      markArtifactDirty(cairn, file.id);
      cairn.sql.run`
        UPDATE artifact SET path_or_url = ${inside}, location = 'managed', updated_at = ${now},
          status = CASE WHEN status = 'missing'
            THEN CASE WHEN category IS NULL THEN 'undescribed' ELSE 'active' END
            ELSE status END
        WHERE id = ${file.id}
      `;
      markArtifactDirty(cairn, file.id);
      moved.push({ from, to: join(cairn.root, inside) });
    }

    const captured: string[] = [];

    for (const [inside, facts] of unrecorded) {
      const { id } = recordManagedFile(cairn, inside, facts, folderSession(cairn, inside));

      markArtifactDirty(cairn, id);
      captured.push(join(cairn.root, inside));
    }

    return { missing, changed, moved, captured };
  });
}
