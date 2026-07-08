# Session ses_0ea3314f8ffeXOrrNECh5btGD6 — Release versioning design and AI-assisted GitHub publishing

## Thread Relevance

This is the foundational design session that created the `release-versioning` thread itself, and it sits squarely inside the charter — touching every subtopic. It settles release versioning (canonical real `v*` tags plus a synthetic mutable `next-release` tag), the rolling "Next Release" draft and how it is rebuilt, the two portable skills (`release-notes` and `cut-release`), and AI-assisted GitHub publishing via two-layer release notes. The work is design only: requirements were grilled, five competing tools were cloned and inspected, and the conclusions were locked and handed off to an OpenSpec change for implementation. No release tooling shipped this session.

## Gaps

The dossier paraphrases the user rather than quoting, so true near-verbatim voice for Intent & Vision is not recoverable — bullets below are faithful close paraphrases. The contents of the OpenSpec `add-release-workflow` proposal/specs/design/task files and of the `/tmp` handoff doc are not detailed. The Final Model states skills live in `.claude/skills/`, but no discrete cited moment settles that location. Research recommended a slim GitHub Action triggered on tag push with aggregation logic in a repo script; the dossier does not confirm whether that CI piece was adopted into the final design (which centers on skills + tags). The exact AI-summarization mechanism/prompt for the thematic summary is not specified. One message (msg_f15f258d3...) also carried an off-charter diff proposing OpenSpec changes for "thread session watermarks" — outside this thread's scope and undetailed. Two artifacts (the OpenSpec change creation and the thread creation) are cited to the same part id (msg_f1647cd80...) despite different timestamps, and the two ingests share timestamp 02:28.

## Decisions

- [2026-06-30 00:22] Real `v*` tags — not draft releases — define release boundaries, to avoid littering the git history with fake/provisional tags. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15e82272001kDi569bMxMPcew)
- [2026-06-30 00:26] Hold the rolling draft on a single moving synthetic tag rather than mixing deployment handling into git commits — the path chosen precisely because the user did not want deployment state baked into commits. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15eb8b16001T6Ack4TXR1NRey)
- [2026-06-30 00:38] Full tag model agreed: real `vMAJOR.MINOR.PATCH` tags are canonical and immutable; one synthetic `next-release` tag carries the draft UX; the draft is rebuilt from `last-real-tag..HEAD`. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15f61cd9001hSWZ6k4rhPpVSK)
- [2026-06-30 00:44] The raw draft is a ledger (factual inventory of changes), not a curated/editorialized changelog. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15fc281d001wTZkatqOh5gw6n)
- [2026-06-30 00:48] Exactly one rolling draft release exists, updated in place on the synthetic tag, titled "Next Release." (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f160014cc001fUVFwzMz9W93kv)
- [2026-06-30 00:50] Lifecycle settled: a real release is tag-first; the GitHub Release publishes the real tag; the rolling draft resets afterward. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f1601713b001UevG0nKkQmcsUJ)
- [2026-06-30 01:59] Consolidate to two skills, not two user-invoked commands: `release-notes` (reusable by the model) and `cut-release` (user-invoked, internally calls `release-notes`). (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f1640707c0017kUlIB9aN0kRjD)
- [2026-06-30 02:02] Authority settled: git history (`last-real-tag..HEAD`) is the source of truth; the rolling draft is a cached projection; `release-notes` always regenerates from git, never from the draft. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f164316cb001OEb6JcoWOnC86E)
- [2026-06-30 02:04] PR entries show title, number, and author username — no SHA clutter; the short SHA instead belongs on direct-commit entries, which carry subject, short SHA, and author username. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f1645b602001kOvvUfgV6osa7D)
- [2026-06-30 02:05] Both the PR and direct-commit sections are ordered oldest-first, timeline-style. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f164602420016W1CI6fmjtY93F)
- [2026-06-30 02:05] Empty sections are omitted from the draft entirely. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f16465e32001Q7795fvtZOX1Vz)
- [2026-06-30 02:06] Draft section sequence settled: Pull Requests first, then Direct Commits (both oldest-first, empties omitted). (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f16474440001znUscSyvwr4dj4)
- [2026-06-30 02:07] Release notes are two-layered: an AI-written thematic summary on top, the full raw ledger below. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f1647cab9001dgng7npbkDkLOE)
- [2026-06-30 02:07] The summary scales elastically with release scope — brief for small releases, longer with grouped themes for major ones. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f16482afc001Pune279e74tcUo)

## Learnings

- [2026-06-29 23:54] The repo has no existing release automation; package.json is `private: true` at version `0.1.0`; no GitHub workflows are in-tree. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15ce4eb7001JrgAQDhXOAIoAL)
- [2026-06-29 23:57] `release-drafter` is only a partial fit — it produces draft release notes but solves neither versioning nor a real maintained changelog. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15d1601c0014CFJUD93BNXquu)
- [2026-06-30 00:02] Popularity ranking of the candidates: changesets > semantic-release > release-please > release-it > release-drafter. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15d60e55001s2L9SULE2tqNCO)
- [2026-06-30 00:08] Because mindframe-z merges some PRs and also commits directly to main, PRs cannot be the primary source of truth — git history is the authority. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15db36ad001M6kRg9Op9H8JET)
- [2026-06-30 00:10] Recommendation: use a slim GitHub Action (not `release-drafter`), keep aggregation logic in a repo script, and trigger the workflow on tag push. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15dd31a2001oQKAOQycxIonaU)
- [2026-06-30 00:12] Recommended raw draft shape: a factual inventory since the previous release — merged PRs with title and number, and direct commits listed separately. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15df289a001Aw1uNiMihfYPiC)
- [2026-06-30 00:22] `release-drafter` is PR-driven, label-driven, and draft-note-driven; it keeps a draft updated as PRs merge and creates releases with a `tag_name`, so it is tag-backed underneath. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15e8937a0017KgRupYWsuiVKn)
- [2026-06-30 00:26] `release-drafter` algorithm: find the last published release as the comparison base, find an existing draft or create one, collect commits/PRs, and attach to the predicted next tag. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15ebdd4200159lWPr1HeHyWOJ)
- [2026-06-30 00:28] Constraint: GitHub draft releases are tag-backed, so a rolling draft cannot avoid a provisional/fake tag — the unreleased view must live elsewhere. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15ed4ed5001LjdmXdY3aY0HhU)
- [2026-06-30 00:32] Cloned-tool inspection confirmed only `release-drafter` offers rolling GitHub draft UX by accepting a provisional tag; the others do not. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15f0e9e4001jccPc7Yfh2Ux91)
- [2026-06-30 02:00] Claude does not support a user-invoked skill calling another user-invoked skill; only a shared, model-reusable skill model works — this is why `cut-release` invokes `release-notes` as a shared skill rather than as a second command. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f16419985001M77EYEsjUET3kK)

## Intent & Vision

- [2026-06-29 23:52] Kicked off wanting to research versioning and release-notes options, delegating the survey to a research subagent. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15cceb9b001cyS4lDRVKPEN3h)
- [2026-06-30 00:01] Wondered what's more popular now and what people actually use — already thinking toward an AI process they could run locally at the moment of cutting a release. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15d49b050014ObJsAhy4IQ6QH)
- [2026-06-30 00:08] Proposed splitting the work into two skills: one to aggregate changes into release notes, another to handle the cutting process. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15db0118001j26vHa2o2f6lIy)
- [2026-06-30 00:12] Kept returning to tags: wanted tags to define release changes, and pressed on whether `release-drafter` actually relies on git tags. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15df11a9001NZzZNoH5pcfk8s)
- [2026-06-30 00:13] Uneasy about mixing deployment handling into commits, and wanted to understand how `release-drafter` deals with that. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15df86da001NmYG2km5dNTpUc)
- [2026-06-30 00:24] Agreed on the tag-first model but still found it "weird" to mix deployment into git commits. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15e9fa83001twJayoCqlERsL6)
- [2026-06-30 00:30] Wanted tags to define release boundaries, and asked whether a draft GitHub release even requires a tag. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15ef6efe001azaWdsU1CahoMO)

## Artifacts Touched

- [2026-06-30 02:07] OpenSpec change `add-release-workflow` created via `openspec new change "add-release-workflow"`; later populated with proposal, capability specs, design, and task files. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f1647cd80001zxTRwaAY46kML8)
- [2026-06-30 02:07] Thread `release-versioning` created via `mfz thread create release-versioning --charter "..."`. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f1647cd80001zxTRwaAY46kML8)
- [2026-06-30 02:28] This session ingested into thread `release-versioning` via `mfz thread ingest ses_0ea3314f8ffeXOrrNECh5btGD6 --thread release-versioning`. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f167783db001sSgnfrWOf9pLF9)
- [2026-06-30 02:28] Session re-ingested to sync the final state. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f167b16ac0012gcfyMV7uhjIDL)
- [2026-06-30 02:51] Handoff artifact (`/tmp/opencode/handoff-release-workflow.md`) and the OpenSpec proposal files written to persist the design decisions. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f168a9834001KuG2hESWYBjIgb)

## Sources

- [2026-06-30 00:31] `release-drafter` source cloned to `/tmp` and read directly to verify its tag-backed draft behavior. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f15f03b97001HD6F5tuB4uXRmj)
- [2026-06-30 00:36] All five candidate tools cloned to `/tmp` and inspected: `release-drafter`, `release-please`, `semantic-release`, `changesets`, `release-it`. (ses_0ea3314f8ffeXOrrNECh5btGD6 · prt_f15f4ae9d001ReHttJ326fx0aF)
- [2026-06-30 00:51] Claude Code documentation and OpenCode docs (https://opencode.ai/docs/), read for how to use skills in an AI-process release cut. (ses_0ea3314f8ffeXOrrNECh5btGD6 · msg_f160288c6001BlYaVi29IiswyL)
