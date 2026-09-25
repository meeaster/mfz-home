import type { LinkInput } from "../schemas.ts";
import { CairnError, timestamp, transaction, type Cairn } from "./db.ts";
import { requireArtifactId, requireEffortId } from "./lookup.ts";
import { markArtifactDirty, markEffortDirty } from "./views.ts";

export type LinkResult = {
  readonly kind: LinkInput["kind"];
  readonly action: LinkInput["action"];
  readonly src: string;
  readonly rel: LinkInput["rel"];
  readonly dst: string;
  readonly changed: boolean;
};

type LinkEndpoints = {
  readonly srcId: number;
  readonly dstId: number;
};

function endpoints(cairn: Cairn, input: LinkInput): LinkEndpoints {
  if (input.kind === "effort") {
    return { srcId: requireEffortId(cairn, input.src), dstId: requireEffortId(cairn, input.dst) };
  }

  return { srcId: requireArtifactId(cairn, input.src), dstId: requireArtifactId(cairn, input.dst) };
}

function refuseReverseDependency(cairn: Cairn, input: LinkInput, srcId: number, dstId: number): void {
  if (input.kind !== "effort" || input.rel !== "depends_on") {
    return;
  }

  const reverse = cairn.sql.get`
    SELECT 1 AS found FROM link WHERE src_kind = 'effort' AND src_id = ${dstId} AND rel = 'depends_on'
      AND dst_kind = 'effort' AND dst_id = ${srcId}
  `;

  if (reverse !== undefined) {
    throw new CairnError(
      "conflict",
      `${input.dst} already depends on ${input.src}. Links read both ways, so keep one direction, or split out the shared piece.`
    );
  }
}

export function link(cairn: Cairn, input: LinkInput, actor: string): LinkResult {
  return transaction(cairn, () => {
    const { srcId, dstId } = endpoints(cairn, input);
    const kind = input.kind;
    let changes = 0;

    if (srcId === dstId) {
      throw new CairnError("invalid", "A link needs two different endpoints");
    }

    if (input.action === "add") {
      refuseReverseDependency(cairn, input, srcId, dstId);
      changes = Number(
        cairn.sql.run`
          INSERT INTO link (src_kind, src_id, rel, dst_kind, dst_id, origin, created_by, created_at)
          VALUES (${kind}, ${srcId}, ${input.rel}, ${kind}, ${dstId}, 'explicit', ${actor}, ${timestamp(cairn)})
          ON CONFLICT (src_kind, src_id, rel, dst_kind, dst_id) DO UPDATE SET origin = 'explicit'
            WHERE origin != 'explicit'
        `.changes
      );
    } else if (input.action === "accept") {
      changes = Number(
        cairn.sql.run`
          UPDATE link SET origin = 'explicit', created_by = ${actor}
          WHERE src_kind = ${kind} AND src_id = ${srcId} AND rel = ${input.rel} AND dst_kind = ${kind}
            AND dst_id = ${dstId} AND origin = 'suggested'
        `.changes
      );
    } else {
      changes = Number(
        cairn.sql.run`
          DELETE FROM link WHERE src_kind = ${kind} AND src_id = ${srcId} AND rel = ${input.rel}
            AND dst_kind = ${kind} AND dst_id = ${dstId}
            AND (${input.action} = 'remove' OR origin = 'suggested')
        `.changes
      );
    }

    if (kind === "effort") {
      markEffortDirty(cairn, srcId);
      markEffortDirty(cairn, dstId);
    } else {
      markArtifactDirty(cairn, srcId);
      markArtifactDirty(cairn, dstId);
    }

    return { kind, action: input.action, src: input.src, rel: input.rel, dst: input.dst, changed: changes > 0 };
  });
}
