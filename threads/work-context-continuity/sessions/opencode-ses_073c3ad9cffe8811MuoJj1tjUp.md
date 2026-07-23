# Session ses_073c3ad9cffe8811MuoJj1tjUp — Work-Unit Context Continuity

## Thread Relevance

Belongs: this session designed, implemented, dogfooded, and iterated on a work-unit model for continuity across sessions, compaction, delegation, and durable artifacts.

## Gaps

The dossier provides OpenCode part IDs but no turn numbers. It names implementation areas and validation totals, but not individual changed file names or the full contents of the cited artifacts.

## Phases

- [2026-07-22 23:49 → 2026-07-23 00:15] Context-continuity problem — established the need for authority-aware, progressively loaded continuity rather than loading every source. (parts msg_f8c3c50f9001lbFytdS8CjP8ka–msg_f8c53bebc001qm8btZIUfgxHKB)
- [2026-07-23 00:43 → 2026-07-23 00:58] Reference and skill exploration — inspected external skill material and adjusted the MFZ activation flow after a lock requirement. (parts msg_f8c6d0a12001fzrXE1rlvmrM1Y–msg_f8c7b25b2001K6IN4ZKr5l7MqQ)
- [2026-07-23 00:59 → 2026-07-23 03:13] Work-unit design and formalization — settled an MVP model, formalized its work location, and made the work unit operational authority. (parts msg_f8c7c357d001ual4H2GPuXwshU–msg_f8cf6f839001dNAmP76hgqfn8k)
- [2026-07-23 03:14 → 2026-07-23 04:04] Implementation and dogfooding — built the runtime and integrations, exercised lifecycle behavior, and corrected observed defects. (parts msg_f8cf81f45001EJ4rOTfUXSNXTp–msg_f8d2547d7001Nnvp38AdcfE5T4)
- [2026-07-23 04:36 → 2026-07-23 06:23] Filesystem-first iteration, delegation, and checkpoints — shifted authored prose to Markdown, tested delegation and restart behavior, and refined checkpoint guidance. (parts msg_f8d429e1e001yPsPmMdw2CxHUF–msg_f8da45390001HhstWt52uv2eva)

## Decisions

- [2026-07-23 00:15] Keep live truth in project files, continuity in threads, broader principles in wiki material, and experimental evidence in prototypes, so alignment can be preserved without loading every source into each session. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c5448b6001uxJdDvU7bF09J3)
- [2026-07-23 00:53] Use stage, review, promote, then enable for MFZ activation because activation was rejected before a reviewed lock existed. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c76519c001XqDSfJnJSN3YR1)
- [2026-07-23 02:12] Make the TUI an observability and debugging surface for configured versus effective context and receipts, rather than a full context dump. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cbecbbc001VzLT7voSc2fKda)
- [2026-07-23 02:33] Define work units separately from OpenCode sessions, MFZ threads, repositories, and OpenSpec changes; the MVP supports one active unit per source-qualified session, cross-repository units, non-linear phase history, and excludes relationships and automatic thread refresh. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cd288c2001zoMleDO7DxvJJM)
- [2026-07-23 02:33] Progressively disclose context through a persistent reminder, lifecycle-boundary orientation, and on-demand routed artifacts rather than replaying transcripts or preloading all sources. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cd288c2001zoMleDO7DxvJJM)
- [2026-07-23 02:59] Treat `work-context-continuity` as historical and stale after formalization, with the work unit becoming operational authority. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cea23d5001EU4DjpFUhg624p)
- [2026-07-23 03:31] Keep storage, schemas, bindings, validation, and CLI in the engine while rendered OpenCode server/TUI adapters live in the personal home; adapters fail open to avoid coupling engine code to that home. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d0734d6001HaOb10j2FOFSsv)
- [2026-07-23 04:36] Author AI-written Markdown directly; retain the CLI for scaffolding, instructions, structural and invariant validation, bindings, and telemetry because prose-heavy mutation flags are only MVP plumbing. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d429e1e001yPsPmMdw2CxHUF)
- [2026-07-23 05:26] Delegate by having the parent name the work unit in the child prompt; the child loads it as supplemental context and remains unbound unless separately attached, rejecting automatic inheritance and a delegation schema. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d7020ce001sI7ZQZCBd7Hnut)
- [2026-07-23 06:12] Reserve immutable, directly authored Markdown checkpoints for meaningful boundaries, not routine progress or duplicated test summaries; CLI provides guidance and validation rather than prose authoring. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d9b0e76001ezlyu4wXJvb2T9)
- [2026-07-23 06:23] Keep the active unit `work-context-continuity` in `validate`; archiving is intentionally not automatic. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da45390001HhstWt52uv2eva)

## Learnings

- [2026-07-23 00:47] No inspected Matt Pocock skill directly handled MFZ context loading, compaction restoration, wiki routing, or thread refresh; only `batch-grill-me` was explicitly invoked. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c70a5de001s4fQZ2DEHKyn3h)
- [2026-07-23 03:57] Dogfooding exercised unbound and attached sessions, exact orientation delivery and receipts, HTTP-triggered compaction checkpoint persistence, scope drift, reverse phase changes, detach, post-compaction continuity, and TUI inspection. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d1eb0490017mrOniM3wLnigF)
- [2026-07-23 04:04] Validation reported OpenSpec `22/22`, engine fast suite `448`, integration suite `131`, personal-home tests `153` plus typecheck, and healthy `mfz doctor`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d2547d7001Nnvp38AdcfE5T4)
- [2026-07-23 05:05] A general child agent without context-loading guidance stayed unbound and reconstructed context through costly OpenSpec, thread, and parent-session archaeology. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d5d656d001w5a631XsirIzUN)
- [2026-07-23 06:21] After compaction, fallback delivery injected orientation revision 6, but the assistant had not visibly re-read the context map or status. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da2e64d001XUNgRMP4AR74ql)

## Mistakes Fixed

- [2026-07-23 03:40] Ordinary reminders were mislabeled `resume`; they were corrected to the `request` boundary. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d0fb688001mBWj05NKTlp2FN)
- [2026-07-23 03:47] Compaction delivery lost its `compaction` boundary and used `reload`; the boundary handling was fixed and revalidated. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d157f52001OfK7oVB9KkoLAq)
- [2026-07-23 04:00] Concurrent attaches could replace one another, and TUI receipt inspection could select another session's receipt; both defects were fixed with regression tests. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d216966001RLAxgjTQgNtJEY)
- [2026-07-23 06:21] The first generated checkpoint lacked its required `id`, causing delivery failure; fallback delivery subsequently restored orientation. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da2e64d001XUNgRMP4AR74ql)

## Issues

- [2026-07-23 06:21] Post-compaction behavior exposed a failed first checkpoint delivery because the generated checkpoint did not contain the required `id`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da2e64d001XUNgRMP4AR74ql)

## Open Questions

- [2026-07-23 06:23] Checkpoint retention, sustained-use TUI usefulness, semantic checkpoint validation, and whether thread refresh should be automated remained unresolved. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da45390001HhstWt52uv2eva)

## Intent & Vision

- [2026-07-23 00:15] The user wanted to preserve alignment across reused sessions, compactions, MFZ threads, wiki material, prototypes, and Markdown artifacts "without loading every source into every session," preferring progressive, authority-aware loading. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c5448b6001uxJdDvU7bF09J3)
- [2026-07-23 02:24] "i think i need more explanation on this" and "i will have more opinions after implementation" — the user accepted a small MVP while reserving judgment until it could be observed operating. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cc9a8c2001tO7RX0iIBE9ydf)
- [2026-07-23 02:35] "i am getting a bit burnt out on the design phase" — the user preferred seeing the MVP before further iteration. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cd41e280016Xitr1UPfaUc16)
- [2026-07-23 04:42] The user preferred a lightweight skill that tells the agent when to use lifecycle commands, human-readable instructions by default, and `--json` for automation. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d487238001somRm3S5FsFyuh)
- [2026-07-23 04:48] The user explicitly requested a general subagent with no context-loading guidance to test whether it would discover the system itself. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d4d83a8001giD6NSNsBbJlVo)
- [2026-07-23 05:23] "it should be up to the parent to tell the subagent what work unit it is" — the user rejected automatic delegation inheritance. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d6de06a001Kj7YgPRJcyLWYJ)
- [2026-07-23 05:26] "it should tell it through the prompt what work unit to load." (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d701ed40015xD8OYiT2xbhOd)
- [2026-07-23 05:31] The user clarified that a work unit is background context, not a replacement for an extensive task brief. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d74b2b5001si0QbvakNHQjTT)
- [2026-07-23 05:20] "cli should just give guidance and validate" for checkpoints rather than authoring their prose. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d6b32f8001kGHiHbNURVyJxY)

## Artifacts Touched

- [2026-07-23 02:59] Formalized MFZ thread `work-context-continuity`, OpenSpec store `mindframe-z-specs`, OpenSpec change `add-work-context-units`, and provisional unit `~/.mindframe-z/work/work-context-continuity/`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8cea23d5001EU4DjpFUhg624p)
- [2026-07-23 03:31] Implemented engine storage, schemas, bindings, validation, and CLI, with rendered OpenCode server and TUI adapters in the personal home. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d0734d6001HaOb10j2FOFSsv)
- [2026-07-23 06:15] Created and validated a pre-compaction checkpoint. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8d9d0135001MWBmGC8HyTiZ69)
- [2026-07-23 06:22] Recorded the active unit's context map, orientation, and checkpoints under `/home/mark/.mindframe-z/work/v1/units/work-context-continuity/`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da435160010BZu73xyHwTgb2)

## Sources

- [2026-07-23 00:47] Matt Pocock skill reference — `/home/mark/.mindframe-z/references/mattpocock-skills/skills/engineering/ask-matt/SKILL.md`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c70a5de001s4fQZ2DEHKyn3h)
- [2026-07-23 00:47] Matt Pocock skills reference — `/home/mark/.mindframe-z/references/mattpocock-skills/`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c70a5de001s4fQZ2DEHKyn3h)
- [2026-07-23 00:47] Mindframe-Z references — `/home/mark/.mindframe-z/references.md`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c70a5de001s4fQZ2DEHKyn3h)
- [2026-07-23 00:47] `batch-grill-me` upstream commit — `ed37663cc5fbef691ddfecd080dff42f7e7e350d`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8c70a5de001s4fQZ2DEHKyn3h)
- [2026-07-23 06:22] Work-context wiki topic — `topics/work-context-and-continuity.md`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da435160010BZu73xyHwTgb2)
- [2026-07-23 06:22] Progressive-context-disclosure wiki theme — `themes/progressive-context-disclosure.md`. (ses_073c3ad9cffe8811MuoJj1tjUp · msg_f8da435160010BZu73xyHwTgb2)
