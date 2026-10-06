# Playbook: update a design from a meeting, email or answer

Everything a routine update needs is on this page. An update has two turns: propose what the source could change (steps 1–2), then, once the user has settled the proposals, apply them (steps 3–7). Open a full reference only where this page sends you, for something it doesn't cover (a new page, a new diagram, a new kind of record).

## 1. Pick it up

- `design.json` in full: the prose, facts and records.
- `changes.md`: the entries since the last session.
- `evidence.json` and `meetings.json`: only the items you will cite or change, unless the update changes why a decision was made or could contradict existing evidence; then read `evidence.json` in full.
- The source (meeting summary, email) in full.

## 2. Propose, don't apply

A meeting or email doesn't change the design until the user says so. First write what it could change, as proposals on the meeting, and change nothing else.

Add the meeting to `meetings.json` with status `Awaiting review`, who attended, a summary, and its proposals:

```json
{"date": "2026-09-29", "title": "Security review of the archive", "Status": "Awaiting review",
 "Who": "Me · Security (2) · Network team (1)",
 "Proposals": [
  {"n": 1, "kind": "Leaning", "target": "D6",
   "proposal": "Lean towards a prefix and a KMS key per customer in one bucket for keeping customer data apart.",
   "before": "Open", "after": "Leaning: a prefix and a KMS key per customer in one bucket",
   "from": "Security said a key per customer is what they'd expect, and nobody argued for separate buckets. Nothing was decided.",
   "recommend": "Accept as leaning", "why": "The room leaned this way but stopped short of deciding; Q10 is still open.",
   "status": "Proposed"}],
 "Summary": ["One line per thing discussed, in the meeting's words."]}
```

Write one proposal for each thing the source settled: a decision, leaning, deferral, answer or partial answer, new question, requirement, deliverable or scope change, or changed figure. One outcome is one proposal, however many records it writes: a decision made on a quote is one proposal whose `also` lists the evidence, facts and option changes it records ("the quote as evidence (E20)", "price facts", "option A set aside"). Don't split one outcome across proposals, and don't repeat it under another kind. Evidence the source brings that no outcome rests on gets its own Evidence proposal.

Propose only what the source itself says, at the strength it said it: a preference stays a preference, "decide later" is a Later decision and not a decision to keep things as they are.

Then look at what the outcomes leave inconsistent: a risk or question the outcome answers or makes moot, a question whose "needed by" no longer fits, a part or requirement that still describes the old state. Each fix that follows directly from an outcome, with no judgment needed, is a `Follow-on` proposal (recommend Accept, saying which outcome it follows from). What needs a judgment call nobody made (whether a deadline now matters, whether a figure explains something) goes under the meeting's `Worth a look`, one short sentence each, and isn't applied. Keep it to the three that matter most; leave out what's merely interesting. Every decision, leaning or deferral the source states is a proposal on a decision record; if none exists, the proposal creates one (`"new": true`, target the next free ID). Also propose, recommending Reject or Ask, anything someone might take for agreed that wasn't (a suggestion, one person's preference, a question nobody picked up), so it's settled once.

The person reading these wasn't necessarily in the meeting and is deciding quickly, often with someone else looking on. The doc shows decisions, leanings, deferrals, answers, deliverable and scope changes, requirements, figures and new questions as full cards, in that order, and folds evidence, risk updates and follow-ons into one "Record keeping" group the user can settle with "accept the rest". Number the proposals in that order, so the numbers read top to bottom.

- `proposal`: one plain sentence, under 30 words, saying what would change, as an action ("Decide…", "Lean towards…", "Record that…"). No field names (Needed by, Blocks, Status) or JSON; say what they mean ("needed before the workers run (P2)").
- `before` and `after`: the state now and if accepted, under 14 words each, in plain words ("open" → "decided: Datadog US1-FED for metrics and APM"; "420 hosts" → "380 hosts: prod and staging"). The detail goes in the record when it's applied, not here.
- `from`: the source's own words behind it, quoted or closely paraphrased; enough to judge without the summary.
- `also`: a list of the other records the proposal writes, a few words each with their IDs; leave it out when there are none.
- `recommend`: `Accept`, `Accept as leaning`, `Ask`, `Defer` or `Reject`; `why`: one sentence on why, naming what was actually agreed or what's missing.
- `kind`: Decided, Leaning, Later, Answer, So far, Deferred, New question, Requirement, Deliverable, Fact, Scope, Risk, Evidence or Follow-on. `status`: `Proposed`.

Run `check` and `build` (`check` warns about long or field-worded proposals; fix them), then reply with the proposals as a numbered list: number, the proposal sentence, and your recommendation, the record-keeping ones last. Stop there until the user settles them. "Accept the rest" means every proposal not otherwise settled takes your recommendation.

## 3. Apply what the user settled

The user settles proposals by number: accept, reject, defer, or accept with a change. For each, set `status` to `Accepted`, `Changed`, `Rejected` or `Deferred`, and for anything but a plain accept put what the user said in `note`. Then apply every accepted and changed proposal (as changed) to the records, as below, and list each in the meeting's `Outcomes`: `<Kind> · <what> → <record IDs, fact:key or deliverable title>`. Set the meeting's status to `Summarised` once nothing is left `Proposed`. `check` fails when an accepted proposal has no outcome, or the latest meeting's outcomes don't match the records.

### Applying each change

**Decision** (`decisions[]`): `Status` is `Open`, `Leaning <option letter>`, `Decided`, `Later` or `Given`. Leaning or Decided needs `Why` (what tipped it, citing IDs, one sentence) and `Answer` or `Leaning` (the answer in a few words). `Decided in`: the meeting (`meeting-2026-09-22`). Options (`options[]`): the leaning one `Current leaning`; once decided the winner `Chosen` and every other `Not chosen Sep 22` or `Set aside Sep 22`, each with `Why not`. Keep every option. `Explanation` stays.

**Question** (`questions[]`): no status field. Partly answered: `So far` (the partial answer, citing evidence) and no `Answer`. Answered: `Answer` (a few words) and `Answered by` (the evidence it became); take it off the `Waiting on` of what it blocked. Deferred: `Deferred` (why it can wait). `Needed by`: `Choosing the design`, `Before building`, `Later phase`, or a phase's title when the source names the phase. `Ask` only when the source named who.

**Evidence** (`evidence[]` in evidence.json): `{"id": "E30", "title": "The finding, as a plain statement.", "Found": "Sep 22", "How we know": "…", "Gathered from": ["Meeting: Platform team, Sep 22"], "Recorded from": "meeting 2026-09-22"}`. An answer becomes evidence.

**Requirement** (`requirements[]`): `Priority` Must or Should, `Why`, `Source`, and three verdicts, each `Verdict · words [IDs]`: `Today` (Meets, Doesn't meet, Unknown, Nothing today), `Design` (Covers, Partly covers, Not covered), `Still to show` (Demonstrated, Intended, Unconfirmed, Nothing left).

**Deliverable** (`plan[]`): `id` (`P4`, the next free number), `Scope`, `Exit criteria`, `Status` (Proposed, Planned, In progress, Done), `Follows`, `Group`, `Serves` (goal numbers) and `Jira` (URLs). It names no effort. Keep IDs stable; a change in order is a change to `Follows`.

**Fact** (`facts`): `"hosts": {"value": "380", "source": "E25"}`. Any number, cost, count or date stated in more than one place is a fact; everywhere else writes `{fact:hosts}`. Change a figure by changing its fact.

**Risk** (`risks[]`): `Likelihood` (High, Medium, Low, Unknown), `If it happens`, `What we'd do`.

Every record that came from this source gets `Recorded from: meeting 2026-09-22` (the one private field; never put paths or private links anywhere else). Keep IDs stable; never renumber. Mention records by ID in text (`the firewall path (D2)`).

## 4. Log it

In `changes.md`, at the bottom:

```markdown
## 2026-09-22 · meeting 2026-09-22
- D4 decided
- Q4 partly answered
- P3 now follows P1: APM moves into the first deliverables
```

## 5. Bring the pages along

Tables, option cards, decision maps, costs and bound diagram parts follow the records on their own. Hand-written text doesn't: each page's "In short", dek and prose, a component's unbound labels, option summaries, and other records' Explanation and Reasoning. For every ID and fact you changed, find every place in the folder that states it (pages, components, all three JSON files) and make it agree, including disagreements that were there before. Update the "Updated" date on each page you changed.

## 6. Check, build, look

Run `python3 <skill>/scripts/doc.py check <folder>` and fix every error and read every warning (`check` fails when the latest meeting's outcomes don't match the records), then `python3 <skill>/scripts/doc.py build <folder>`.

Look only at what you changed by hand: take a screenshot (`node <skill>/scripts/shot.mjs <built>.html out.png --page <page> --selector "#<section>"`) of each page section or component you edited, and fix what's wrong. Record-only changes render from the records and need no screenshot.

### Check what you changed for stale text

Hand-written text goes stale while you apply: a page's prose, a component's labels, an option summary, another record's Explanation. Once the build passes, check every place that mentions an ID or fact you changed against the records as they now stand, looking for an old status, an old figure, a choice described as still open, or an option described as still live. When the user's setup has a reviewer (another model or session), give it the meeting's outcomes and have it do this check read-only, then fix what it finds and rebuild.

## 7. Report

What changed, by ID; each outcome and where it landed; what the source raised that you didn't apply, and why; anything you couldn't settle.
