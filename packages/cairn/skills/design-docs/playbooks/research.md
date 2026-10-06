# Playbook: research open questions

Everything a research run needs is on this page. A research run takes the open questions marked `Answer from: Research · where to look`, finds what the knowledge base already says, researches the rest, and records what it finds. Evidence is what we found, with where we found it, so it goes in directly: no proposals, and no waiting for the user. What the findings imply for the design itself is reported, not applied.

## 1. Pick it up

- `design.json` in full, `evidence.json` in full (research must not repeat or contradict a finding without saying so), and `changes.md` since the last session.
- The questions in scope: the ones the user named, or every open question whose `Answer from` starts with `Research`.

## 2. Look in the knowledge base first

Before researching anything, find what's already known. Dispatch a read-only explore agent (Claude Code's `Explore`, OpenCode's `explore`) with the questions in scope, each with its Explanation and where to look, and ask it for every knowledge article section that bears on each question: the article and section, what it says, and when it was last known true. It searches with `catalog_find` (category `knowledge`) and reads `<root>/knowledge/index.md`. Without a subagent, do the same search yourself. The step is done when every question in scope has its knowledge-base findings listed, or a note that the search found none.

A claim the knowledge base already holds becomes evidence the way any article does: copy the claim into an evidence item and cite the article's section in `Recorded from` (`knowledge aws-environment · Transit gateways`). Research only what's left.

## 3. Research the rest

Go where each question says to look, and further when that runs dry. Use read-only access: documentation, repositories, read-only cloud and vendor consoles or APIs; the systems you look at stay exactly as they were.

Keep raw material you'd need again (an export, a long excerpt, a configuration file) as an evidence file at the path `catalog_location` gives, and cite it in the evidence item's `Recorded from`.

## 4. Record what you found

Apply directly; this is the session's own work, logged like any other.

**Evidence** (`evidence[]` in evidence.json): one item per finding, a plain statement of what is true, with `Found` (today), `How we know`, `Gathered from` as `Kind: portable description` (`Documentation: Datadog OPW · Syslog source`, `Repository: network-config · sites/vpn.tf`), and `Recorded from: session <your catalog id>` (plus the evidence file or article it came from).

**Questions** (`questions[]`):
- **Answered** when the evidence settles it outright: `Answer` (a few words) and `Answered by` (the evidence). Take the question off the `Waiting on` of each decision it blocked.
- **Partly answered** when it narrows the question but doesn't settle it, or rests on something indirect (a vendor page that doesn't name our version, a repository that may not be what's deployed): `So far`, citing the evidence. An `Answer` is for evidence that settles the question directly.
- **Not found**: leave it open and say what you searched in the report. When it turns out only a person can answer it, change `Answer from` to `Person` or `Approval`.

Everything else in the design stays as it is: a decision's status, a requirement's verdicts, an option, a phase and the scope change on the user's word (see [lifecycle](../references/lifecycle.md#working-on-it)). When a finding bears on one of them (it favours an option, breaks a requirement, makes a risk moot), say so in the report.

## 5. Log it, bring the pages along, check

In `changes.md`, at the bottom, one entry for the run:

```markdown
## 2026-10-06 · session claude-code:7f3c2a91
- Research: Q4, Q7, Q10
- Q7 answered (E14)
- Q10 partly answered (E15)
- E14, E15 added
```

Then, as after any change: find every place in the folder that states an ID you changed (pages, components, other records' Explanation and Reasoning) and make it agree; run `python3 <skill>/scripts/doc.py check <folder>`, fix every error and read every warning; and run `build`.

## 6. Report

- Each question in scope: answered, partly answered or not found, with the evidence IDs, and for one not found, where you looked.
- What the findings mean for the design: each decision, requirement, option or risk they bear on, what they point towards, and that it's the user's call.
- What came from the knowledge base and what was new.
- **Knowledge-base candidates:** findings about something that exists outside this design (an AWS environment, a vendor's product, another team's service) that a later session would otherwise research again. Name the article each would go in, existing or new. Write them up only when the user says so, following the effort-context skill's knowledge reference: the knowledge base is shared across all the work and has its own rules for sources.
