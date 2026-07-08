# Digest — release-versioning

## Current State
The release workflow is **fully designed but not yet built** — a design-only session settled the model and handed it off for implementation. Requirements were grilled and five off-the-shelf tools (`changesets`, `semantic-release`, `release-please`, `release-it`, `release-drafter`) were cloned and inspected before the team rejected adopting any of them wholesale in favor of a repo-owned, AI-assisted approach. What is locked: the tag/versioning model, the single rolling "Next Release" draft, the two skills (`release-notes` and `cut-release`), and the two-layer release-notes format. No release tooling, skills, or CI has shipped. The design is filed in an OpenSpec change for the build.

## Components
- **Tag / versioning model** — canonical, immutable `vMAJOR.MINOR.PATCH` tags define release boundaries; a single mutable synthetic `next-release` tag carries the draft · design settled.
- **Rolling "Next Release" draft** — exactly one GitHub draft release, pinned to the synthetic tag, rebuilt in place from `last-real-tag..HEAD` as a cached projection · design settled.
- **`release-notes` skill** — model-reusable; regenerates the two-layer notes from git history, never from the draft · specified, not implemented.
- **`cut-release` skill** — user-invoked; tag-first release cut that calls `release-notes` and publishes the GitHub Release · specified, not implemented.
- **Two-layer release notes** — AI thematic summary (elastic length) over a factual raw ledger (Pull Requests then Direct Commits) · format settled; AI summarization step unspecified.
- **Cross-cutting** — git history (`last-real-tag..HEAD`) is the single source of truth; the draft is only a projection of it; never litter history with fake/provisional tags; keep deployment/unreleased state out of commits.

## Direction
- Implementation is filed in the OpenSpec change `add-release-workflow` (proposal, capability specs, design, tasks) — the resume point for the build.
- Build `release-notes` (regenerates from `last-real-tag..HEAD`) first, then `cut-release` (user-invoked, tag-first, calls `release-notes`) to the settled spec.
- Stand up the synthetic `next-release` tag plumbing and the single in-place "Next Release" draft.
- Resolve the open questions below (CI piece, summary mechanism, skill location) as part of the build.

## Open Questions
- Does the final design include a slim GitHub Action (triggered on tag push, with aggregation logic in a repo script) as the initial research recommended, or stay purely skills + tags + local run? The design pivoted toward the latter; adoption of any CI piece was never confirmed.
- What exact mechanism/prompt produces the AI thematic summary layer? It is specified as a concept, not a procedure.
- Where do the two skills physically live? The model assumes a skills directory (`.claude/skills/`), but the location was never explicitly decided.

## Key Decisions
- **Tags define releases.** Real `vMAJOR.MINOR.PATCH` tags are canonical and immutable and mark release boundaries — chosen over draft-release-defined boundaries to avoid littering git history with fake/provisional tags.
- **One synthetic tag holds the draft.** A single mutable `next-release` tag carries the rolling-draft UX, keeping unreleased/deployment state off real commits.
- **Git history is the source of truth.** `release-notes` always regenerates from `last-real-tag..HEAD`; the rolling draft is a cached projection, never read back as authority — because the repo both merges PRs *and* commits directly to main, so PRs can't be primary.
- **Two skills, not two commands.** `release-notes` (model-reusable) and `cut-release` (user-invoked); Claude can't have one user-invoked skill call another, so `cut-release` invokes `release-notes` as a shared skill.
- **One rolling draft, titled "Next Release,"** updated in place on the synthetic tag, rebuilt from git each time.
- **Tag-first lifecycle.** Cutting a release creates the real tag first, publishes the GitHub Release on it, then resets the rolling draft.
- **Raw draft is a ledger, not a changelog** — factual inventory of changes, not editorialized.
- **Two-layer notes.** AI-written thematic summary on top (scales elastically — brief for small releases, grouped themes for large ones); full raw ledger below.
- **Ledger shape.** Pull Requests section first (title, #number, @author — no SHA), then Direct Commits (subject, short SHA, @author); both oldest-first, timeline-style; empty sections omitted.

## Design
```
Release model
=============

git:  ──●──────●─────●─────●─────●──▶ HEAD
        │                  └──┬──┘
   last real tag        commits + merged PRs since
   vX.Y.Z                     │
   (canonical, immutable)     ▼
                       next-release  (synthetic, mutable tag)
                              │
                              ▼
                  "Next Release" draft  (one, updated in place)
                  = cached projection of last-real-tag..HEAD

Cut a real release (tag-first):
  1. create real vX.Y.Z tag
  2. release-notes regenerates from git (last-real-tag..HEAD)
  3. publish GitHub Release on the real tag
  4. rolling draft resets

Release notes — two layers
  ┌──────────────────────────────────────────┐
  │ AI thematic summary  (elastic length)     │  ← top
  ├──────────────────────────────────────────┤
  │ Raw ledger:                               │
  │   Pull Requests   (title #num @author)    │
  │   Direct Commits  (subject shortSHA @auth)│
  │   both oldest-first · empty sections omit  │  ← bottom
  └──────────────────────────────────────────┘

Skills
  cut-release (user-invoked) ──calls──▶ release-notes (model-reusable)
                                         always regenerates from git
```

## Intent
The user set out to research release versioning and release-notes options for mindframe-z, but was really after a concrete, **AI-assisted process they could run locally at the moment of cutting a release** rather than a heavyweight off-the-shelf CI tool. Two convictions shaped everything: tags should define release boundaries with no fake or provisional tags cluttering history, and deployment/unreleased state should stay out of git commits. Because the repo both merges PRs and commits directly to main, git history — not PRs — had to be the authority. They wanted the work split into two reusable skills: one to aggregate changes into release notes, one to drive the cut.

## Vision
The user pictures an AI-assisted, local release cut: at release time, `cut-release` creates the version tag, regenerates two-layer notes from git history (an AI thematic summary over a factual ledger), and publishes the GitHub Release — while a single rolling "Next Release" draft always reflects everything since the last real release. The framing shifted over the session: the opening survey leaned toward adopting an existing tool or a slim CI Action, but the landing point is a repo-owned skills-plus-tags model, with whether any thin CI piece remains still left open.

## Perspective
- Tags are the right backbone; cluttering git history with fake or provisional tags is to be avoided.
- Found it "weird" and uncomfortable to mix deployment handling into git commits — returned to this unease repeatedly even after agreeing to the tag-first model.
- Git history is the real authority, not PRs, precisely because work lands both as merged PRs and as direct commits to main.
- The unreleased view should be an honest factual ledger, not an editorialized changelog.
- Taste in presentation: timeline-style oldest-first ordering; PR entries kept clean (title / number / author) without SHA clutter; short SHAs only where they matter (direct commits); empty sections dropped.
- Curious about what teams actually use now, not just what exists — noted `changesets` as most popular (ahead of `semantic-release`, `release-please`, `release-it`, `release-drafter`) and concluded `release-drafter` was only a partial fit, solving draft notes but neither versioning nor a maintained changelog.

## Sources
- `release-drafter`, `release-please`, `semantic-release`, `changesets`, `release-it` — all five candidate tools cloned to `/tmp` and read directly; `release-drafter` inspected most closely to confirm its draft releases are tag-backed (it predicts the next tag and attaches the draft to it).
- Claude Code documentation.
- OpenCode docs — https://opencode.ai/docs/
