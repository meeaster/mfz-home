# Outcome

## Verdict

OpenWiki is promising as a **derived synthesis and navigation projection**, not
as the canonical memory store or the core session-analysis engine.

The useful case was a cross-source project corpus containing a structured thread
design record and a later exploratory transcript. OpenWiki added value when it
was given explicit provenance and a project-specific synthesis contract. It did
not add value when asked to re-summarize already-curated thread digests.

## What worked

- Personal cross-source synthesis reconciled structured design material with
  later exploratory material.
- Explicit source roles and chronology prevented exploratory material from
  being mistaken for settled implementation status.
- Project state, decisions, commitments, questions, themes, and source evidence
  could be separated into navigable pages.
- Code mode produced a practical first-pass map for repository onboarding.

## What did not work

- Thread-only synthesis double-summarized curated digests and lost detail.
- The default 24-hour Git ingestion window is unsuitable for arbitrary
  historical transcript or thread experiments.
- Generic Personal-mode pages were too opinionated for a small transcript-only
  corpus until a project-specific contract was provided.
- Git staging commit dates are unsafe as source chronology when files are copied
  into an aggregate repository.
- The generated code-mode workflow and agent snippets were unsuitable for
  direct adoption.

## Provenance correction

The first cross-source run incorrectly treated the July transcript as
foundational and the June digest as later. The cause was transport history: both
canonical sources had been copied into one new staging Git commit.

The correction added a provenance manifest containing canonical paths, source
roles, timestamps, source commit metadata, and SHA-256 values. A fresh wiki run
then used the June digest as the primary structured design record and the July
transcript as later exploratory evidence. This correction is the primary design
lesson from the experiment.

## Configuration findings

OpenWiki `0.1.1` is mainly customized through:

- `~/.openwiki/INSTRUCTIONS.md` for the overall wiki goal.
- Per-source `ingestionGoal` configuration.
- Connector filters and schedules.
- Provider and model selection.
- Agent-directed page organization.

This is not yet a fully declarative knowledge schema. Stronger guarantees for
arbitrary local transcript folders, historical ingestion, provenance,
deduplication, deletion handling, incremental updates, and stale-state cleanup
would likely require code changes or a dedicated ingestion layer.

The code and Personal modes have different instruction layers. Code mode has
built-in repository-documentation behavior and optionally reads a target
repository's `openwiki/INSTRUCTIONS.md`. The generated `AGENTS.md` and
`CLAUDE.md` blocks only explain how agents should navigate the generated wiki;
they do not define the synthesis schema.

## Privacy and safety

- Cloud inference sends ingested source content to the configured provider.
- The ChatGPT subscription OAuth transport used in the prototype is
  undocumented/internal.
- Temporary credential files were kept in isolated prototype homes and their
  values were not part of the report.
- Raw transcripts and source repositories remained unchanged; hashes and clean
  Git status were checked during the experiments.
- The generated CI workflow used unpinned installation and actions, OpenRouter
  assumptions, scheduled writes, and broad permissions. It must not be copied
  into this home unchanged.

## Recommended next evaluation

Use one bounded project corpus containing:

- One thread digest.
- Related voice transcripts.
- One additional source such as email or Slack, if privacy approval allows it.

Evaluate chronology, citations, source reconciliation, uncertainty handling,
incremental updates, duplicate evidence, and stale commitments. Keep the
canonical sources outside the generated wiki and compare OpenWiki output with
direct source inspection.

## Untested or unresolved

- Production OpenWiki home and connector architecture.
- Incremental updates after source edits.
- Deletion handling and stale-page cleanup.
- Robust deduplication across repeated or overlapping sources.
- Work-source privacy, retention, and employer-policy constraints.
- Gmail, Slack, Notion, Jira, Confluence, Teams, or Datadog ingestion.
- Whether OpenWiki should consume session-analysis artifacts rather than raw
  sessions.
- The durable relationship between OpenWiki, Mindframe-Z threads, and a future
  harness/runtime abstraction.

## Temporary artifacts

The following paths were used for disposable testing and are not canonical:

- `/tmp/opencode/openwiki`
- `/tmp/opencode/openwiki-prototype`
- `/tmp/opencode/openwiki-prototype-home`
- `/tmp/opencode/openwiki-transcript-prototype`
- `/tmp/opencode/openwiki-thread-home`
- `/tmp/opencode/openwiki-project-source`
- `/tmp/opencode/openwiki-project-home`
- `/tmp/opencode/openwiki-project-home-v2`
- `/tmp/opencode/mindframe-z-openwiki-test`
