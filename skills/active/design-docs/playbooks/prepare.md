# Playbook: prepare the writer's packet

A design gathers more than one writer can read: the records, every meeting, the research reports, and the knowledge articles and transcripts behind them. The packet is what gathering workers read on the writer's behalf, cut down to what the change needs: the system and the change in connected prose, the evidence and constraints that bear on it, and a map of everything in the design it touches. The writer reads the packet and `design.json`, and writes from them without reopening the pile.

Prepare one when the change rests on more than the writer can read alongside the design: a new version or change of direction, a new design built from many sources, a recommendation run across many decisions, or a meeting or email that brings long transcripts or research with it. Gathering runs on inexpensive models, but each worker still reads its share, so a packet pays only when it saves the writer more reading than it costs; a meeting on its own goes straight to [update.md](update.md), which reads the outline and the records the meeting touches. An editing pass ([edit.md](edit.md)) changes wording, not meaning, and needs none. [Research](research.md) is gathering itself: it reads a packet when there is one and adds what it finds.

The packet is a working copy, never a source. The records and the original sources stay authoritative, preparing it changes neither, and it changes no approval step: meeting proposals still wait for the user, and recommendations stay advice.

## Who does what

| Step | Who | In OpenCode, with the `roles` skill (task type `design-docs`) |
| --- | --- | --- |
| Map the change, keep the packet current, hand it off | You, the session talking to the user | — |
| Gather | Workers, one per domain | explorer; researcher when it looks beyond the design folder and the knowledge base |
| Compile | One fresh worker | explorer |
| Check | Workers that didn't compile it, one per domain | inspector |
| Write | You, or the model the user picked for writing | — |

`roles` takes each role's model from `role-models`, using the `design-docs` task type where the user's profile has a row for it and the role's default otherwise. Handing work to a role doesn't start orchestration. Without it, use the cheapest model the harness offers that reads carefully, and say which in your report.

## 1. Start the packet

A packet serves one session's task. A later session works on something else, so it prepares its own rather than reusing an old one. Keep it as files, so it survives compaction and the workers and writer can read it: `brief.md`, `evidence.md` and `coverage.md` (step 4 says what each holds), in the session's working folder (the one your setup names for the session's files), or in a temporary directory when there's none. Never put it in the design folder: it's not part of the design, and its local paths must not reach the repository.

## 2. Map what the change touches

Read the outline (`doc.mjs outline <folder>`); for a new design, the request and the sources named for it. Have one worker read `design.json`, the pages and the components in full and list every record and page that the change touches or that depends on them. In `coverage.md`, write the change under discussion and every record and page topic it touches: the requirements, decisions, questions, facts, risks, flows and deliverables it changes, and those that depend on them. Look across the whole design, not just the area the change names: a change of hosting reaches the archive's permissions and the rollback plan.

Then list the sources that bear on it (evidence, meetings, research reports, knowledge articles, transcripts, repositories), including those that argue against the change. Follow repository and knowledge-base guidance before looking anything up. A source left out gets a reason; one you're unsure of gets gathered. A source you can't reach is a named gap, not a sign there's nothing there.

**Done when** every touched record and every relevant source is in `coverage.md`, assigned to a domain or named as a gap.

## 3. Gather by domain

Split the sources into domains by the questions they answer (routing, the archive, identity and permissions, cost, rollout), not into equal piles of files, and split a domain again when one worker would have to compact to finish it. A small change can be one domain.

Brief each worker with the change, the working direction, its domain's sources, the domains it overlaps, and what to return. Workers read everything relevant in their domain, follow a consequence out of it when they find one, and report overlaps and missing sources. They gather; they don't choose architecture or accept requirements. Each returns:

- Findings, each with the exact quote or enough of the passage to write from, where it is, when it was observed, which version it applies to, and its limits.
- What people said, by who said it: the user and accepted proposals; colleagues' guidance; AI advice; choices nobody has made.
- Constraints that shape the options, not only what's unknown: failure and recovery, interfaces and data formats, permissions, rollout, ownership, validation.
- The record IDs each finding bears on, conflicts between sources, what was left out and why, and what wasn't read.

**Done when** every domain is read in full or its gap is named, and each finding makes sense without the worker's transcript.

## 4. Compile

A fresh worker reads the workers' results and writes the three files, with one home for each claim:

| File | Holds |
| --- | --- |
| `brief.md` | The system and the change, connected: the problem and why it matters, the goals and what's left out, who reads the doc, how it works today and as proposed, the working direction, the requirements the change bears on, and the change itself. Dated figures for scale, apart from forecasts and chosen settings. |
| `evidence.md` | Each supported claim with what kind it is, its scope, date and version, where it is, and enough detail to write from. Keep the distinctions that change a choice: modes, product contracts, trust and read boundaries, failure and recovery, compatibility, permissions, and what telemetry can and can't show. |
| `coverage.md` | The touched records and topics and what happens to each, dependencies, conflicts, sources read and left out, and gaps. For a new version, the carryforward map: every current record and page topic and where it goes in the new version (kept, merged, dropped). The map is for the writer; the new version never tells that story. |

Where results conflict, a source's authority is unclear, or a consequential detail is missing, the compiler opens the original passage and notes it under Reopened originals. A worker's result shows what it read, not how the system behaves.

A packet compiled from record IDs alone loses what sits between them, so keep these apart:

- A requirement's priority, who accepted it, where it came from, and whether anything has shown it's met.
- The data contract, where it's hosted, and how far it rolls out.
- What's known around an open choice: "destination undecided" still carries each destination's format, permissions and failure behaviour.
- Who to ask and who would like to own what: dated, and not an assignment.
- Which model made a recommendation: it's neither who decided nor a confidence.

Write as much as the change needs, without whole reports pasted in or the brief repeated in every file. Say at the top of `brief.md` how long the packet is and what the writer must read and may consult. Local paths stay in the packet; what reaches the design follows its usual privacy rules.

**Done when** a writer who has read nothing else could explain the system and the change, keep its constraints and who decided what, and say what's still open.

## 5. Check it

Workers that didn't compile the packet check it against the originals, one domain each; a small packet can get one direct comparison. They judge meaning, not sentence counts: what's missing that matters, what's distorted, what's generalised past its source, and what was safely cut. They confirm each locator opens the passage it cites, and check the givens and priorities, exclusions, figures for scale, product and mode distinctions, data and trust boundaries, failure and rollback, and the constraints around open questions. A complete ID count shows none of that.

Fix what they find and recheck those domains. Set `status` in `brief.md` to `ready`, `ready with gaps` (naming them under Gaps), or `blocked`. An open design question can stay open; a consequential claim with no support in the packet is fixed or kept out of the writing.

**Done when** no known loss remains and the writer is told which gaps limit the work.

## 6. Keep it current

While the user talks, notice when the change grows; they won't always say so. Keep apart what was explored, what's proposed and what the user accepted. When a new point reaches a dependency or challenges a claim, send gathering at those domains, several at once when several are reached, and fold the results in before reasoning or writing that rests on them. A new source, a conflicting finding, a changed requirement or a new direction calls for checking what it touches: neither a full reread nor reuse unchecked. A claim keeps the date it was observed; refreshing the packet doesn't make it current. When work continues after accepted changes land, bring the packet in line with the records first.

## 7. Hand off and write

Give the writer the packet, what's agreed, the gaps, and the playbook for the task. The writer reads `brief.md` and what it marks required, the outline, the records `coverage.md` lists (`doc.mjs show`), the `changes.md` entries since the handoff, the pages and components it changes, and the skill references the edits need. It writes from the packet's supported claims without reopening evidence, transcripts, meetings or reports. It opens an original when something contradicts, a consequential detail is missing, who decided is unclear, the date could change the claim, or it's about to write something the packet doesn't cover. A broad new dependency goes back to gathering, not into the writer's context.

The task's own steps finish the work: the sweep for every place a changed ID or fact appears, `check`, the review of what it says, and screenshots where pages changed. If records were renumbered, update the packet's references; old IDs stay in `coverage.md`, never in the design. A packet is never permission to change or publish the design.

## Without workers

When subagents aren't available or allowed, build the same packet yourself, one domain at a time, and say so in your report. When the relevant material won't fit, name the domains you couldn't cover and ask for a narrower task or for workers; compacting your context doesn't count as having read something.
