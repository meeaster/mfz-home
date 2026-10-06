# Playbook: recommend what to decide

Everything a recommendation run needs is on this page. A recommendation run reads the whole design and writes the AI's recommendation on open decisions and questions: what it would pick, why, what would change its mind, and how sure it is. The published doc shows each one labelled as AI, apart from the team's own view, so the people deciding can agree, disagree or ignore it. A recommendation is advice: it goes in directly, and the decision's status, leaning and answer stay exactly as the team left them.

These are judgement calls, so run them with the most capable model available.

## 1. Pick it up

Read everything: the recommendation is only as good as what it weighs.

- `design.json` in full: the problem, goals, requirements, options, costs, risks and the questions each decision waits on.
- `evidence.json` in full, and `meetings.json` for what people have said about each decision.
- `changes.md` since the last session.

The records in scope: the ones the user named, or else every decision that's Open or Leaning (and Later when what it follows is settled) and every open question whose `Answer from` is `Person` or `Approval`, where it has no recommendation yet or `check` says its recommendation is out of date. A question marked `Research` gets researched instead ([the research playbook](research.md)): evidence beats a suggestion.

## 2. Weigh each one

For a decision, weigh its options against the requirements they must meet, their costs and risks, the evidence, and the questions it waits on. For a question, work out the most likely answer from what the design and evidence already show.

Recommend from what's in the folder. When the call turns on something the design doesn't hold (a figure nobody has, a ruling security hasn't made), say so in `Because` and set the confidence to match, rather than filling the gap. When the team already leans one way, agree or disagree plainly; a recommendation that only repeats the leaning without its own reason adds nothing.

## 3. Write the recommendation

On the decision or question in `design.json`:

```json
"Recommendation": {"value": "B", "items": [
  "Because: Customer traffic ending in Shared Tooling hangs on a security ruling nobody has yet (Q2), and its free addresses leave little room as customers join (E3).",
  "Would change if: Security allows customer traffic to end in Shared Tooling (Q2).",
  "Confidence: High",
  "Model: <your model's name and version>",
  "Made: 2026-10-06",
  "Seen: E9"]}
```

- The value: the option's ID for a decision with options; otherwise the answer in a few words.
- `Because`: one or two sentences, citing the IDs it rests on.
- `Would change if`: the finding or answer that would flip it, by ID when there is one.
- `Confidence`: `High` when the evidence settles it and nothing open could flip it; `Medium` when an open question could; `Low` when it rests on judgement, or on what someone else has yet to say.
- `Model`: the model writing it, by the short name people use for it (`Opus 5.5`, `Sonnet`, `GPT Sol 6.1`), taken from what your harness or session reports rather than from memory. Readers weigh a recommendation by the model behind it, and the name sits in a small tag beside table rows, so leave out the provider, the platform ("on Amazon Bedrock") and any model ID; a version only when you know it. `check` warns when the name runs past about 24 characters.
- `Made`: today. `Seen`: the highest evidence ID in `evidence.json` now.

Refreshing one replaces it whole, model included. Leave everything else on the record as it is.

## 4. Log it and check

In `changes.md`, at the bottom:

```markdown
## 2026-10-06 · session claude-code:7f3c2a91
- Recommendations: D1, D2 (refreshed), Q9
```

Run `python3 <skill>/scripts/doc.py check <folder>` until every recommendation in scope is clear of warnings, then `build`. The doc renders recommendations from the records, so nothing on the pages needs editing.

## 5. Report

One line per record, in order of how much it matters to settle: the ID, what's recommended, the confidence, and the reason in a few words. Name the model once at the top. Put first the ones that disagree with the team's leaning. List the records you left without a recommendation and why: what's missing, and whether research could find it.
