# OpenWiki Evaluation

This prototype evaluated OpenWiki `0.1.1` as a personal cross-source synthesis
layer, a repository code-onboarding wiki, and a possible projection over a
larger session-analysis system.

The work was reconstructed selectively from the long OpenCode session
`ses_0af831d81ffee8iye5Lk02q9XQ`, titled `OpenWiki ChatGPT and OpenCode Go
Support`, which ran in this home on 2026-07-11. This durable report is not a
copy of the transcript.

## Prototype boundary

The generated wikis, temporary source repositories, and isolated OpenWiki homes
remain outside this repository under `/tmp/opencode/`. This repository keeps
the experiment description and conclusions, not generated wiki output.

The experiments used `gpt-5.6-terra` through the `openai-chatgpt` provider. The
subscription OAuth transport was an undocumented/internal integration and is
prototype-only. The source checkout used for historical tests was a disposable
working copy of OpenWiki; its ingestion window was changed from 24 hours to
roughly ten years. Historical results therefore do not represent stock
`0.1.1` behavior.

## Experiment 1: Source and CLI investigation

OpenWiki was cloned to `/tmp/opencode/openwiki`, then a disposable working copy
was built at `/tmp/opencode/openwiki-prototype`. The investigation covered:

- Personal and code output modes.
- Connector configuration and ingestion windows.
- `INSTRUCTIONS.md` and per-source ingestion goals.
- Provenance and generated metadata.
- Code-mode prompts and repository integration files.
- ChatGPT provider/model configuration.

The prototype confirmed that OpenWiki's Personal mode is a synthesis workflow,
while Code mode writes repository documentation under `openwiki/`. A target
code repository may provide its own `openwiki/INSTRUCTIONS.md`, but the code
experiment itself used built-in code-mode defaults rather than a custom brief.

The generated `AGENTS.md` and `CLAUDE.md` blocks are navigation instructions,
not the content-generation schema. The generated workflow is a separate,
unsafe automation artifact and is not part of this prototype's adopted setup.

## Experiment 2: Single transcript ingestion

An immutable voice transcript was copied byte-for-byte into the disposable Git
source `/tmp/opencode/openwiki-transcript-prototype`. The isolated OpenWiki
home was `/tmp/opencode/openwiki-prototype-home` and its output was:

```text
/tmp/opencode/openwiki-prototype-home/.openwiki/wiki/
```

The source hash was checked before and after staging. OpenWiki produced a
`quickstart.md`, `themes.md`, `commitments.md`, `sources/git-repo.md`, and
`.last-update.json`.

This was technically successful, but a small source set was compressed into
OpenWiki's generic Personal schema. It demonstrated the mechanics, not yet a
satisfactory long-term knowledge model.

## Experiment 3: Existing thread repository

The source was the personal thread destination repository:

```text
/home/mark/.mindframe-z/thread-destinations/personal
```

The isolated output was:

```text
/tmp/opencode/openwiki-thread-home/.openwiki/wiki/
```

The initial stock-window run produced no useful output because no commits fell
inside the default 24-hour window. The modified historical-window prototype
later indexed the thread repository, including the top-level thread directories
and their manifests and digests.

The result was not valuable. OpenWiki mostly summarized already-curated thread
digests a second time, compressed detail, and risked inferring stale commitments
or status. The existing thread manifests and digests should remain authoritative
and be queried directly with exact citations rather than passed through generic
Personal synthesis wholesale.

The source repository remained clean and unchanged.

## Experiment 4: Cross-source project synthesis

The source repository `/tmp/opencode/openwiki-project-source` combined:

- A July 11 exploratory voice transcript copied from
  `/mnt/c/Users/chewb/VoiceNotes/Transcripts/20260711_013533_40a330836496.md`.
- A June 27 structured thread digest copied from
  `/home/mark/.mindframe-z/thread-destinations/personal/thread-log-system/digest.md`.

The first run used `/tmp/opencode/openwiki-project-home`. It was rejected as
chronologically flawed. Both source files had been copied into a single staging
Git commit, so OpenWiki treated transport commit time as source chronology.

The correction added `provenance.json` to the staging repository with canonical
paths, source roles, recorded and processed timestamps, source commit metadata,
and SHA-256 values. The Personal instructions and onboarding configuration were
also strengthened to require provenance-first chronology and source-date status.

The corrected run used a fresh home:

```text
/tmp/opencode/openwiki-project-home-v2/.openwiki/wiki/
```

It produced:

- `quickstart.md`
- `projects/agent-workflow.md`
- `decisions.md`
- `commitments.md`
- `open-questions.md`
- `themes.md`
- `sources/git-repo.md`

This was the strongest positive result. It preserved the June structured design
as the primary record for its decisions, treated the later July transcript as
exploratory evidence, and identified the unresolved relationship between them
without inventing project status, owners, or implementation milestones.

## Experiment 5: Code wiki

The disposable clone was:

```text
/tmp/opencode/mindframe-z-openwiki-test
```

The generated output was:

```text
/tmp/opencode/mindframe-z-openwiki-test/openwiki/
```

It included `quickstart.md`, `architecture.md`, `workflows.md`,
`threads-and-sandbox.md`, `verification.md`, and `.last-update.json`.

The code wiki was useful as a first-pass onboarding map over existing README,
architecture documentation, source structure, workflows, and verification
commands. It is a navigation and synthesis layer, not a replacement for
maintained repository documentation.

The clone also received `AGENTS.md`, `CLAUDE.md`, and
`.github/workflows/openwiki-update.yml`. Those files were not copied into the
real repository. The workflow assumes OpenRouter/API billing, uses unsuitable
automation defaults for this setup, and grants scheduled write behavior.

## Durable conclusion

OpenWiki is best treated as a derived, replaceable consultation layer over
canonical sources such as transcripts, sessions, thread digests, repositories,
and eventually other personal or work systems. It should not become the
canonical store for raw transcripts or sensitive work data.

The cross-source project experiment added value because it reconciled two
different source types while preserving chronology and uncertainty. The
thread-only experiment did not add value because it summarized already-curated
material. Code mode is useful as an optional onboarding accelerator when its
output is reviewed.

The larger memory-system direction should preserve conversation trajectories,
including user turns, agent responses, later revisions, source provenance, and
uncertainty. OpenWiki may become one read model over that system; it is not yet
the session-analysis engine or harness abstraction.

See [OUTCOME.md](OUTCOME.md) for the comparative verdict, safety constraints,
and untested areas.
