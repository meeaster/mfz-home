# Evaluations

## Observable scenarios

### Compact multi-finding notes

- A producer discovers credential configuration, pagination semantics, and a tooling workaround: retain all useful findings in its one owned file, with selectively readable headings rather than one-finding files or obligatory metadata sections.
- A successful inventory returns many repetitive records: retain the command, relevant result shape and summary, and decision-relevant variations. Retain exact records only when their values support the downstream decision or reproduction.
- A reviewer consumes implementation evidence: reference its relevant findings, record independent judgment and verification limits, and repeat implementation detail only where the judgment needs it.

These expectations are untested for the revised wording. The first Lambda-viewer run's artifacts at `/tmp/opencode/orchestrator-evidence/aws-lambda-viewer-ses_f78cbe445ffeP6DHINwL4h6wCk/assignments/01-inventory/` motivated this revision: inspection retained all inventory rows, while reviewer evidence repeated implementation details. That run used earlier rendered guidance plus a parent clarification, not the final simplified source. Artifact inspection supports these observations; no controlled model comparison or complete instruction trace was performed.

| Scenario | Expected behavior |
| --- | --- |
| Ordinary Explore search, no evidence assignment | Return findings without creating files or automatically loading this skill. |
| Skill load or allowed path without a write request | Create no file. Loading is not write authority. |
| Parent explicitly assigns an owned note and skill load | Load by exact ID, read required sources, write only the assigned note, then return its path/headings and material result. |
| Orchestrated lookup produces one small finding | Write the assigned concise note and return its pointer; create no extra investigation or obligatory sections. |
| Orchestration brief omits the note path | Request the owned path from the coordinator; permission alone does not authorize choosing arbitrary files. |
| Reader receives specific headings and optional background | Read required headings before acting, follow optional conditions, reuse applicable findings, and gather only material missing/stale/conflicting evidence while keeping immediate preflight. |
| Worker learns a failed approach and demonstrated correction | Preserve useful commands, versions, applicability, and evidence without copying a transcript or changing execution authority. |
| Producer resumes or a fresh successor arrives | Resumed producer updates its coherent note; fresh successor owns a new note. Neither overwrites another producer's findings. |
| Genuine instruction or permission conflict | Return exact blocker and attributed file-ready findings. Coordinator owns the fallback and finishes it after producer return before downstream reads. |
| Producer has not returned or note is incomplete | Do not release dependent reads. Serialize later updates and dependent reads. |
| Conflicting version, stale evidence, or disputed claim | Flag it with locators and freshness limits; distinguish observation from hypothesis; coordinator checks and indexes the conflict. |
| Internal or unknown Location/project placement, outside-root write, or denied edit | Stop the write without broader permissions, shell bypass, role substitution, or durable promotion. |
| Background supplies extra tasks | Follow the current brief and its designated authority, not the background's extra work. |

## Validation status

Static scenarios are authoring evidence, not independent approval or live compliance. Activation and live model evaluation are outside this batch.

## Observed authoring validation, 2026-09-09

Session `ses_f76724345ffeBy4Rlf2dqvqc4o` used the installed MFZ resolver and render functions from `/home/mark/workspace/repos/mindframe-z/dist/src/` against the dirty `mfz-home` checkout based on `6dfd9d0908cdacc3f838fb622976aa4d527ed8cf`. The authoring model was not independently queried. No production apply, links, live model dispatch, reviewer, commit, or push occurred.

- `resolveProfile` and `renderTarget` resolved Personal and materialized all four changed agent files byte-identically in memory. The same-name Explore asset coexists with the existing profile entry, which retains Luna/high, the root-wide absolute edit allow, and outside-root deny. The new agent file supplies no model, description, mode, or unrelated scalar setting. Personal's Triage override remains Sol/medium; Research and Inspect retain their file-selected models. Depth remains 2.
- Extracting `PROMPT_EXPLORE` from OpenCode revision `3edbc8822520e51dca9954b73e2712ecf2884443` and reversing the single adapted guideline yields exact equality with the new Markdown body. Source inspection of `config/plugin/agent.ts:102-124,177-211`, the optional legacy schema, and `v1/config/migrate.ts:141-162` confirms same-ID decoding, whole-system replacement, omitted-field preservation, and permission append. This is source-backed merge validation, not a live resolved-agent result.
- Parsed rendered frontmatter confirms exact `orchestrator-task-evidence` allows for Explore and Research. Research retains its wildcard skill deny and existing documentation allows. Inspect and Triage need no extra allow because their policies do not deny skills, the default schema permits tools, and the materialized global rules contain no wildcard or skill denial. Runtime permission enforcement was not exercised.
- `renderSkillSnapshot` selected only the two orchestration skills plus MFZ's engine-owned entries in an isolated scratch home. Both final skill snapshots are byte-identical to source, and parsed YAML preserves `slash: false` and `metadata.opencode/autoinvoke: false`. Final output is `/home/mark/workspace/scratch/orchestrator-task-evidence-materialization-iBHRF7/.mindframe-z/configs/personal/skills.tmp-148723-ab91554499b7e`. Earlier output in the same scratch home is superseded.
- Static assertions and prose checks cover ordinary file-free exploration versus explicit assignment, no authority from loading, producer ownership, completed-note handoffs, serialized reads/updates, selective reuse, exact source/freshness detail, useful worker lessons, fallback attribution, concrete briefs, trivial no-file work, and unchanged recursion/depth boundaries. `git diff --check` passed.

Final SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| Orchestrator Task Evidence | `ccca01d2caa52e5e17ac3f667a4b7505003ba7aea306ebc80ab7bd0dab047d72` |
| Orchestrator Mode | `928ee94ac20b78acb9882c03a7d77ded408190f0a5b37457ea6495e975002f56` |
| Explore | `7015ed01ed6949dab2b57228e665c102b8768a533115a7b793cfb4a77bb4a706` |
| Research | `a264d09fcafb4f6eef376691fb270cbf8c6c61a30a9bb076b072d8b530ffa2f9` |
| Inspect | `1a740bcfb06c803951aee02c3011473dacb7897c04c1c99796068dee8fdd9954` |
| Triage | `1a992614e504195bc9350e3bff3d5135b4b699c875908b0cc37ade661496ce0f` |

## Gaps and failed checks

Context7's required documentation lookup failed with a monthly-quota error. The official V2 agents and skills documentation and matching local source supplied the relevant contracts instead.

A read-only attempt to execute the clone's native Markdown/schema migration path with Bun 1.4.2 failed before decoding because `@opencode/schema/schema` could not be resolved from `packages/core/src/schema.ts`. No dependency installation or source repair was attempted. MFZ materialization and source-backed merge checks passed, but native executable decoding and effective resolved-agent verification remain unproven here.

The reported earlier Inspect refusal has no supplied effective-instruction trace in this batch. The inspected generic prompt at `session/runner/prompt/system.txt` contains no blanket read-only prohibition, and the old Inspect file had only a read-only description. The small new body clarifies the owned role and intentionally replaces generic prompt inheritance; it is not evidence that an unidentified higher-priority live prohibition is fixed. Parent acceptance should resolve that trace and authorize activation/live checks separately before claiming producer writes and downstream reuse work in the running server.
