<!-- design-docs format 2 -->
# WHAT WE'RE BUILDING

ONE SENTENCE ON WHAT THE SYSTEM DOES.

## Problem

THE PROBLEM TODAY, WHO IT AFFECTS, AND WHAT IT COSTS. THE VALUE OF SOLVING IT.

## Goals

- GOAL, AS AN OUTCOME

Not in scope: WHAT A READER MIGHT ASSUME IS INCLUDED, AND ISN'T.

## How it works

THE SHAPE OF THE SOLUTION IN PROSE: HOW THE PARTS CONNECT AND WHY THAT SHAPE, NAMING THE DECISIONS (D1) THAT SHAPE IT. AN AGENT READS THIS TO UNDERSTAND THE DESIGN; THE OVERVIEW SHOWS IT.

```text
A DIAGRAM IN TEXT OF THE PARTS AND FLOWS, FOR AGENTS. THE PAGES DRAW THEIR OWN.
```

## Terms

- **TERM** [overview]: PLAIN DEFINITION.

## Requirements

### R1 · REQUIREMENT.
- Short: SHORT LABEL
- Priority: Must
- Why: WHY IT MATTERS.
- Source: WHO OR WHAT SAYS SO
- Met: Yes · HOW THE DESIGN MEETS IT. [E1]
- Recorded from: request

Once the design has areas, a record that belongs to one gets "Page: <area id>", and "Applies to: <ids>" names the other areas it reaches. Records without a Page live on the overview.

## Parts

### PART
- Does: WHAT IT DOES.
- Decided by: D1
- Evidence: E1

## Phases

### PHASE NAME
- Scope: WHAT THIS PHASE DELIVERS.
- Exit criteria: HOW EVERYONE KNOWS IT'S DONE.
- Status: Planned
- Effort: THE EFFORT DOING IT (ITS SLUG)

## Decisions

### D1 · THE DECISION, AS A QUESTION?
- Explanation: WHAT'S BEING DECIDED, IN PLAIN WORDS, AND WHERE IT FITS: THE PART OF THE DESIGN IT'S ABOUT, WHAT IT FOLLOWS OR FEEDS (D2), AND THE GOAL OR REQUIREMENT IT SERVES (R1).
- Rail: SHORT QUESTION
- Shapes: WHAT IT SHAPES.
- Status: Open
- So far: WHAT'S KNOWN, OR WHAT THE DESIGN ASSUMES MEANWHILE.
- Waiting on: Q1
- Worked out in: No brief yet

#### A · OPTION NAME
- Short: TWO WORDS
- Summary: ONE-LINE SUMMARY.
- Works well:
  - BENEFIT.
- Costs and risks:
  - COST OR RISK.
- Evidence:
  - E1: WHAT E1 SHOWS FOR THIS OPTION.
- Meets R1: Yes · HOW THIS OPTION MEETS IT.

#### B · ANOTHER OPTION
- Short: TWO WORDS
- Summary: ONE-LINE SUMMARY.
- Works well:
  - BENEFIT.
- Costs and risks:
  - COST OR RISK.
- Meets R1: Partly · WHAT'S MISSING (Q1).

### D2 · A SETTLED DECISION?
- Status: Decided
- Answer: WHAT WAS DECIDED.
- Why: WHAT TIPPED IT, IN ONE SENTENCE, CITING THE EVIDENCE (E1).
- Reasoning:
  - WHAT ELSE WEIGHED IN, OR A TRADEOFF ACCEPTED.
- Revisit if: WHAT WOULD REOPEN IT.
- Also considered:
  - AN ALTERNATIVE THAT WAS PLAINLY WORSE: WHY NOT.
- Worked out in: WHERE IT WAS SETTLED (A PAGE, A MEETING ID, OR WORDS)

## Risks

### RISK.
- Likelihood: Medium
- If it happens: EFFECT.
- What we'd do: RESPONSE.
- Linked: E1

## Costs

### LINE ITEM
- Drives: WHAT DRIVES IT.
- Monthly: $0
- Evidence: E1

### A LINE THAT DEPENDS ON AN OPTION
- Drives: WHAT DRIVES IT.
- Monthly: A $0 · B $0
- Varies with: D1
- Evidence: E1

## Flows

### S-F1 · FROM → TO
- Path: HOW IT TRAVELS
- Data: WHAT IT CARRIES
- In transit: HOW IT'S PROTECTED ON THE WAY.
- Auth: HOW EACH END IS TRUSTED
- Crosses: Yes · THE BOUNDARY IT CROSSES
- Assessment: Partly · WHAT'S STILL NEEDED [Q1]

## Questions

### Q1 · QUESTION?
- Explanation: WHAT WE'RE TRYING TO FIND OUT, IN PLAIN WORDS, AND WHY WHAT IT BLOCKS (D1) NEEDS THE ANSWER.
- Who: NAME (other team)
- Blocks: D1
- So far: A PARTIAL ANSWER, IF THERE IS ONE (E1).

### Q2 · AN ANSWERED QUESTION?
- Who: NAME (our team)
- Blocks: D2
- Answer: THE ANSWER, IN A FEW WORDS.
- Answered by: E1

## Evidence

### E1 · FINDING, AS A PLAIN STATEMENT.
- Found: Mon D
- How we know: HOW IT WAS ESTABLISHED.
- Gathered from:
  - KIND OF SOURCE: PORTABLE DESCRIPTION, NO LOCAL PATHS
- Recorded from: WHERE IT CAME FROM (SESSION ID, LOCAL PATH, TICKET); NEVER PUBLISHED

## Meetings
