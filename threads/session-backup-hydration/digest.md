# Digest — session-backup-hydration

## Current State

The feature is built, hardened, and running in production. `mfz sessions backup` extracts and uploads raw per-session harness data (Claude `.jsonl` verbatim, OpenCode via `opencode export`) to a named S3 archive defined in machine-config, guarded by a freshness check and a bucket-hardening preflight. The hydration consumer reads vanished sessions back from archive during thread refresh/ingest, and has been through an adversarial-review hardening pass (atomic staged commits, negative caching of confirmed-absent sessions, profile-pinned archives skipped on read). All 23 implementation tasks are checked off, all 256+ tests pass, and the pipeline has been verified end-to-end against real AWS infrastructure: a prototype bucket holding real backups was deleted and replaced by a hardened production bucket (`mfz-sessions-685287549590`, archive renamed `personal-proto` → `personal`), a live backup swept 763 objects with the freshness guard correctly skipping unchanged sessions on rerun, and hydration was verified byte-for-byte correct from real S3 into a scratch directory. An hourly system-crontab job now runs the backup command in production. A collateral bug was also found and fixed in the unrelated `claude-code-sessions` discovery skill, which had been invisible to keyword search for this very feature's sessions.

## Components

- **`archives` machine-config concept** — named S3 stores `{name, bucket, region, profile}`, exactly one `default: true` (writable), rest read-only, referenced by name from thread destinations to keep backup independent of threads · built, schema wired into `MachineManifest`, in production use.
- **`mfz sessions backup`** — extracts raw per-session data (flat `<harness>/<id>` layout), uploads only changed sessions via a freshness guard, aborts on a bucket-hardening preflight failure with directive error messages · built, verified against real infra, running hourly via cron.
- **Session hydration consumer** — reads vanished sessions back from the default/readable archives during thread refresh/ingest; `classifyWatermark` distinguishes `vanished` from `shrank` so only truly absent sessions trigger a read · built and hardened (atomic staging, negative caching, profile-pinned read skip), verified against real S3.
- **OpenCode enumeration** — sessions enumerated and freshness-signaled via `opencode.db`'s `session` table (not the older per-file mtime layout, which no longer exists) · built.
- **Collateral: `claude-code-sessions` discovery skill** — fixed a bug where non-interactively-launched sessions (no `history.jsonl` line) were invisible to keyword search, and where sandbox-blocked variable expansion caused the skill to look in the wrong store · fixed and verified.
- **Cross-cutting** — no silent cross-account/profile access on either write or read path; write-once/atomic-commit semantics so a failure never leaves a partial or corrupted local/remote state; behavior verified against real AWS infrastructure rather than mocks wherever feasible.

## Direction

- Resume point: `openspec/changes/session-backup-hydration/` (proposal, design, tasks, specs) — all 23 tasks are checked complete; PR documentation was being drafted as of the last session, with no further detail recorded on its contents.
- Remaining follow-up: finalize/merge the PR for this change; no other outstanding implementation work is recorded.

## Open Questions

- Archive discovery/browsing mechanics for surfacing archived sessions not already known locally (a proposed two-phase `ListObjectsV2` index → title/cwd/recency triage → hydrate → judge-intent flow) were designed then explicitly deferred as vNext scope, and remain unaddressed by any later session.

## Key Decisions

- Back up raw harness-native session files (Claude `.jsonl`, OpenCode export), not the synthesized thread store — raw traces face real deletion risk (e.g. Claude's 30-day window), synthesized data is already durable via git.
- Build native S3 backup with `@aws-sdk/client-s3` rather than shell out to `aws s3 sync` or wrap rclone/restic — avoids external tool dependency drift and follows a preference for a vendor's official SDK.
- Restore/hydration granularity is surgical per-session-id, never a bulk mirror-back.
- Archive unit is a normalized per-session extraction (Claude raw, OpenCode via `opencode export <id>`, unsanitized/full-fidelity), stored flat as `<harness>/<id>` — the private, encrypted, IAM-scoped bucket is the security boundary, not sanitization.
- OpenCode enumeration and freshness signal query `opencode.db`'s `session` table (max of `time_updated`/`time_created`) — the prior `storage/session/info/<id>.json` mtime approach no longer matches OpenCode's current DB-backed storage layout.
- Freshness guard is non-negotiable on both the backup upload path (skip unchanged sessions) and OpenCode extraction (avoid re-running an expensive per-session export sweep).
- Archives are routed strictly by origin machine, IAM-enforced, never by content/purpose; cross-machine "promotion" of a session is dropped entirely as YAGNI, not merely deferred.
- No built-in scheduler inside mfz — `mfz sessions backup` is a single manually- or externally-triggered command; in production this is satisfied by an hourly system-crontab entry, independent of Claude Code.
- S3 preflight requires **bucket-level** Block Public Access (not just account-level), and distinguishes the "disabled" case from the "not configured at all" case with a directive error either way.
- Hydration downloads are fully atomic — staged and committed via rename only once every key succeeds — to eliminate silent 0-byte-body masking and partial-cache corruption on failure.
- The hydration read path skips profile-pinned archives, mirroring the write path's "no silent wrong-account access" rule.
- Confirmed-absent sessions are negative-cached so repeated hydration attempts short-circuit without re-querying S3.
- `classifyWatermark` splits `vanished` (absent) from `shrank` (present but truncated) so only genuinely vanished sessions trigger an archive read.
- The prototype S3 bucket (holding real backups accumulated during development) was deleted and replaced by a freshly hardened production bucket; the machine-config archive was renamed `personal-proto` → `personal` to match.

## Design

```
Local harness stores                         S3 archive (per machine-config)
┌─────────────────────┐   mfz sessions       ┌───────────────────────────┐
│ Claude .jsonl        │───backup (freshness │ default (writable) archive │
│ OpenCode opencode.db │    guard + preflight)│  <harness>/<id>            │
└─────────────────────┘──────────────────────▶  read-only archives (N)    │
                                               └───────────────────────────┘
                                                          │
                                    hydrate vanished       │ atomic stage→rename
                                    session on refresh      │ negative-cache absent
                                    (profile-pinned skip)   │ profile-pinned skip
                                                          ▼
                                        Local thread ingest / cache
```

## Intent

The problem is data loss: harness-native session transcripts (especially Claude's, which age out after 30 days) are the only unrecovered raw record once a session vanishes locally, while the thread system's own synthesized data is already safe via git. The goal was a machine-scoped, IAM-boundary-respecting backup of that raw data, paired with a consumer that can transparently rehydrate a session a thread still needs once it disappears locally — without ever risking a silent cross-account leak or a half-written local cache.

## Vision

Originally scoped narrowly (ship the backup command, defer the entire hydration/discovery consumer to a later build) on the reasoning that backup is perishable while a consumer can be built whenever. That vision advanced quickly: the hydration consumer was built in the very next session rather than deferred, and was later hardened through an adversarial review pass and run against real production infrastructure with a live cron job — the feature now sits fully built and operating unattended, with only the broader "discover archived sessions not yet known locally" capability still explicitly left for a future vNext.

## Perspective

A recurring engineering stance throughout: prefer owning simple mechanisms over depending on external tools (native S3 SDK over rclone/restic or CLI wrapping), and prefer cutting scope aggressively when a boundary reveals unnecessary coupling — discovery was deferred specifically because it was "the only thing that reached back into the base feature," and cross-machine session promotion was dropped outright as pure YAGNI rather than merely shelved. There's also a clear preference for decisive simplicity over staged complexity (rejecting a built-in scheduler in favor of "just wire your own cron"), and a strong instinct that irreversible operations (deleting a bucket with real backups) warrant a check-in even under explicit prior instruction, rather than blind execution. Verification-mindedness runs throughout: preference for testing against real infrastructure (real S3, real buckets, real cron) over mocks wherever the risk of a false-positive result was high enough to matter.

## Sources

- opencode — https://github.com/anomalyco/opencode.git (consulted: `packages/opencode/src/cli/cmd/export.ts`, `packages/opencode/src/storage/storage.ts`, confirming the `export` command and per-session JSON storage layout)
