---
name: debugging
description: Find the cause of a bug, regression, crash, hang, leak, performance drop, or flaky failure from observed facts before fixing it. Use when asked why something fails or behaves unexpectedly, when the cause isn't already evident, or when an earlier fix didn't hold. Skip it when the error message already names the cause or the task is writing tests.
---

# Debugging

Treat diagnosis as constraint satisfaction. Observed **facts** constrain; **hypotheses** are inferred. The cause is the hypothesis that fits every fact, so most of the work is gathering facts that leave few hypotheses standing.

Agents fail here in predictable ways: a confident narrative built from code they read, a rare edge case they can reproduce mistaken for the reported bug, a fact that doesn't fit quietly dropped. Each rule below guards against one of these.

Scale the loop to the bug. When one fact already pins the cause, such as a stack trace naming a line that just changed, a single quick pass suffices: confirm the fact, check the candidate against everything else known, fix, and confirm by the signal.

## Facts and hypotheses

- A **fact** is something observed in the failing system: the bug report, error output, logs, traces, profiles, metrics, packet captures, process or kernel state, configuration, flag values, versions, deploy and version-control history. Record where and how each was gathered so it can be cited.
- A **hypothesis** is anything inferred: a suspected cause, a narrative, a conclusion drawn from reading code, and a reproduction you built.
- Code shows what can happen, not what did. Start from facts; read code to generate hypotheses once signals point somewhere, and to locate the fix. When the failure runs locally and deterministically, running it and capturing its output is the first fact.
- Facts are fixed. If one looks wrong, re-gather it, or ask whoever supplied it to recheck how it was gathered (host, time window, version, tool). Never reinterpret a fact to fit a hypothesis.
- Gather broadly: different kinds of data, and the same kind from several instances of the failure. A pattern that repeats across instances and is absent from the control is likely real. Prefer counts and measurements you can compare (5 DNS addresses against 400) over impressions.

## Step 1: Isolate signals with a control

The **variable** is the failing case. A **control** is a case that differs from it in as few ways as possible: the same code with the flag off, the last good version against the first bad one, a working host beside a failing one, a passing input beside a failing one. Build or find the control yourself; ask the human only when it needs access you lack.

- A **signal** is a fact present in the variable and absent from the control. A fact present in both is **noise**: it can eliminate hypotheses that depend on it, but it never shows where to look.
- When the working case differs from the variable in too many ways, a case that fails differently and more loudly often makes a sharper control.
- Before trusting the comparison, check that the control isn't broken the same way as the variable; if it is, every real signal reads as noise.
- The control locates the cause; it isn't the fix. When the variable differs from the control by an intentional change, such as a rename, refactor, or upgrade, fix what the change broke and keep the change. Revert to the control only when the human wants the change itself undone.

Done when each signal is listed with the control comparison that makes it one.

## Step 2: Choose the most promising hypothesis

- A signal is **strong** when few hypotheses fit it, ideally one, and **weak** when most do. Headline symptoms (latency percentiles, error rates, SLO breaches, "it times out") are usually weak.
- Build a hypothesis-by-fact table: rows are hypotheses, columns are facts (signals and noise), and each cell records fits, contradicts, or says nothing. Read down columns to find strong signals; read across rows to find a hypothesis that no fact contradicts.
- Pursue the hypothesis that fits the strongest signal. Testing every hypothesis wastes effort, and picking the most plausible one is how wrong narratives win.

When no row survives, adjust the hypotheses before inventing new ones, in this order:

1. Recheck how each contradicting fact was gathered.
2. Split a hypothesis that bundles separate changes or mechanisms ("the deploy did it") into ones that can be checked separately; a fact that contradicts one part leaves the others standing.
3. Merge narrow hypotheses that each explain one instance (host 17's disk, host 42's GC pauses) into the shared cause that explains all of them.
4. Combine hypotheses that each explain different facts and contradict none. Every cause in a combination must be necessary: removing it leaves some fact unexplained.
5. Only then form a new hypothesis, grounded in facts already gathered.

When every signal is weak, or no hypothesis survives those moves, stop generating hypotheses and gather facts from one layer down, for example logs and configuration, then traces and profiles, then network captures, then process and thread state, then kernel state. Start with what the report already provides or what is cheap to collect, and stop descending at the first strong signal.

## Step 3: Validate against every fact

- The candidate is the cause only if it fits every fact gathered, noise included. One contradiction discards it, or the part of a combination it belongs to.
- Cite the fact behind each claim. Drop any claim you can't cite.
- A reproduction proves that a bug exists, not that it is this bug. Accept it only when it produces the same strong signal as the reported failure; matching symptoms aren't enough. A reproduction that fails this check plays no further part.
- When a reviewer or subagent checks the diagnosis, give it the job of elimination: find a contradicting fact, a signal that also appears in the control, a fact gathered from the wrong place, or a cause in a combination that isn't necessary. Agreement from a reviewer with the same context counts for little, and no reviewer can see facts nobody gathered.

## Fixing and reporting

- Confirm the fix by the signal: after the change, the variable's strong signal matches the control. A passing test that never exhibited the signal doesn't confirm the fix.
- When candidate fixes trade off differently (disable a cache, or make the state machine safe to re-enter), present the options with your reasoning and let the human choose. Do the same for decisions with organizational weight, such as rollbacks, escalations, or dropping support.
- Report the cause, the cited facts that establish it, the control used, and each eliminated hypothesis with the fact that eliminated it. Include the table when more than one hypothesis was considered.
