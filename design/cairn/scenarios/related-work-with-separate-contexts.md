# Related work with separate working contexts

## The human's situation

The human asks an agent to evaluate a repository's documentation before changing its organization. The agent reads many files and develops an inventory of current guides, historical designs, experiments, backups, and unresolved proposals. The discussion then develops into a second, related task: bring the workflow skills under Cairn's identity, potentially packaging them with its software.

The human wants both changes. They want to work on Cairn first because its resulting names, ownership, and behavior will affect how the documentation should be organized. But much of the context already loaded concerns documentation rather than skill implementation.

At roughly 118,000 tokens of reported session context, the human asks how to continue. They consider a saved record, compaction, fresh sessions, and a fork. Their concern is preserving the understanding already developed while giving the next work an appropriate context.

This scenario describes that conversation and the continuation it needs to support. The later implementation and resume examples are desired behavior, not reports that those actions have happened.

## The documentation concern that started the work

The repository's documentation mixes several kinds of information. Some pages describe current behavior. Others preserve older workflow designs, reasoning behind decisions, experiments, conversations, and plans that were never accepted or have since been replaced.

The human wants current usage documentation to explain how the repository works today. They also want to preserve the other material because future agents need to understand their vision, choices, reasoning, and perspective. "Old" does not mean "worthless." An earlier approach may explain a current constraint or show why an apparently attractive option was rejected.

The agent initially recommends moving much of the material into an archive. The human clarifies that an archive alone does not express its continuing value as design context. The conversation develops a distinction between maintained implementation documentation and durable design understanding.

The preservation requirement includes qualifications, rejected alternatives, and unresolved ideas. A shorter document that retains the conclusion but removes why the human reached it would fail this need. So would a summary that turns an agent's proposed structure into an accepted human decision.

The documentation investigation also produces practical findings: which files overlap, which contain mixed purposes, where claims have drifted, and a proposed mapping into a clearer organization. Those findings are useful for later work even though the exact destination structure remains subject to discussion.

## A related change emerges

The human points out that the former orchestration mode has become a broader set of workflow skills. It includes design collaboration, orchestration, delegated outputs, capture, and continuation. Naming the whole system after orchestration no longer describes it well.

The agent proposes "Agent Workflows." The human finds that too generic and suggests Cairn as a concrete identity, with "the Cairn workflow" as a way to describe the system.

This creates implementation questions. Does Cairn merely become the shared identity? Do skill entry points change? Are the skills physically packaged with the catalog software? How should evaluations be named and organized? Those questions cannot be answered just by adopting the umbrella name.

The human chooses to discuss and perform the Cairn changes before the broad documentation restructure. They also request a checkpoint of existing repository changes, which is committed and pushed. That checkpoint preserves source changes, but it does not by itself preserve the meaning of the ongoing discussion.

## Two deliverables need different context

Both deliverables share the human's perspective on working with agents, preserving understanding, and making context available selectively. Their immediate working material differs:

| Deliverable | What a working session needs | What should remain available on demand |
| --- | --- | --- |
| Cairn consolidation | The intended identity, behavior of the skills, ownership and packaging questions, relevant integrations, and evaluation expectations. | The broader documentation inventory and detailed historical pages, unless they answer a specific design question. |
| Documentation restructuring | The human's preservation requirements, the earlier inventory and proposed mapping, and the Cairn decisions that the documentation must explain. | Detailed implementation investigations and test traces, unless needed to establish a documentation claim. |

The documentation deliverable also includes integrations and instruction-authoring material outside Cairn. It has a broader scope than documenting the Cairn implementation alone.

The human does not want either session to begin with the entire earlier conversation. They also do not want a new agent to work from a minimal task label and miss why the work matters.

## Continuation points the workflow must support

### 1. Capture before leaving the long discussion

When the human asks to capture the work, the result needs to preserve more than a task checklist:

- The human wants both current documentation and preserved design understanding.
- Their perspective and the reasons for accepted decisions are valuable future context.
- Cairn is the proposed shared identity for the workflow system, while packaging and exact naming still need decisions.
- Cairn work precedes the broad documentation restructure because it changes what that documentation must explain.
- The documentation investigation has already produced useful findings and a proposed file mapping.
- Existing repository changes have been checkpointed; later edits and their verification state must be distinguishable from that checkpoint.
- Effort organization, continuation mechanics, and implementation details discussed by the agent remain proposals unless the human accepts them.

The human needs to inspect and correct this understanding in Markdown. Supporting records should remain discoverable without all being copied into the next agent's initial context.

The capture must preserve the human's correction to the original archive recommendation. Otherwise, a successor could repeat the same well-intended cleanup and lose the distinction the conversation established.

### 2. Start a focused Cairn session

A fresh agent needs enough understanding to discuss Cairn's role and make the next choices with the human. It should know why orchestration alone is too narrow a name and why the generic "Agent Workflows" suggestion did not fit.

It should recognize that shared identity and physical packaging are separate decisions. The earlier conversation does not authorize it to treat a possible package layout as settled.

The agent can inspect relevant skills, configuration, and software as needed. It should not repeat the broad documentation audit merely to recover the goal, nor load every historical page simply because those pages belong to the larger subject.

If a specific past design choice affects the new work, the agent needs a way to reach its reasoning. Focused context means selecting relevant detail, not discarding it.

### 3. Preserve decisions made during Cairn work

As the human settles naming, ownership, or packaging, those decisions affect the later documentation task. The resulting understanding needs to include what was chosen, why, what was implemented, and what remains incomplete or unverified.

For example, if skills retain their existing names under a Cairn umbrella, the documentation session must not follow an earlier proposal that renamed every entry point. This is an illustrative possibility, not an accepted naming decision.

The human should not need to manually rewrite the same decision in several places to keep the two deliverables aligned. Nor should a decision relevant to both be hidden in one implementation session's closing message.

### 4. Resume the documentation work

The documentation agent needs the earlier preservation goals and inventory together with the settled Cairn direction. These come from different stages of the work.

It should recover which documents were identified as historical, mixed-purpose, stale, or useful current guidance. It should also understand that the proposed destination mapping was a starting point and may need to change after Cairn consolidation.

Rechecking files that changed is appropriate. Repeating the whole original investigation because the record retained only "restructure docs" would be a continuation failure.

The agent must preserve the distinction between describing current behavior and explaining intended direction. An accepted vision can remain valuable even where implementation has not yet reached it. An old experiment can remain useful evidence without defining current behavior.

### 5. Follow a relationship without absorbing all related work

During documentation work, an agent may need to understand one Cairn packaging decision. That should lead to the relevant accepted reasoning and implementation facts, not automatically to every skill investigation and evaluation trace.

Conversely, a Cairn agent may need the human's documentation-preservation requirements because a proposed rename would affect discoverability. That does not mean the agent needs the complete file-by-file documentation mapping.

Each deliverable needs enough shared understanding to avoid inconsistent work, with deeper material available when a question warrants it. A later change affecting both should be visible to both.

### 6. Recover a relevant idea that remains undecided

Some useful ideas from the initial conversation may stay unresolved while implementation proceeds. Starting a fresh session does not make those ideas irrelevant, but their continued availability must not make them accepted requirements.

For example, a proposed organization for historical design records may still matter when documentation resumes. The agent should be able to find the proposal, understand the motivation and any human reservations, and ask the next useful question.

Storing every open idea only in a record associated with the old run risks hiding it from a new session continuing the subject. Loading every old run in full creates the opposite problem. The workflow must preserve both discoverability and selective reading.

## The effort-boundary question remains open

In the discussion, the agent first recommends one effort with two phases. After the human points out the different working contexts, the agent recommends two linked efforts instead.

The human has exposed an ambiguity, not selected a topology. Both recommendations need to be judged against the continuation needs above.

One effort could retain shared intent while separating detailed working material. Two linked efforts could provide focused current understanding for each deliverable while sharing relevant decisions and evidence. Neither arrangement succeeds merely because it uses the preferred number of containers.

The useful questions are whether each deliverable has a recognizable outcome, whether it can be continued independently, what it needs from the other, and how the human finds their shared reasoning later. Session boundaries and storage boundaries need not be identical.

The documentation work may become more independent as it addresses subjects outside Cairn. Any later separation should preserve the original conversation's contribution to both, rather than assigning the entire discussion exclusively to one subject and losing the other connection.

## Observable success and failure

| Continuation behavior | Success | Failure |
| --- | --- | --- |
| Recover intent | The new agent explains the human's goals and the corrections that shaped the direction. | It receives only a task list and repeats a rejected approach. |
| Preserve authority | Human decisions, agent proposals, and unresolved questions remain distinguishable. | A suggested package layout or effort arrangement becomes a requirement without acceptance. |
| Select context | Each session loads shared intent and the material needed for its next work. | Every session loads both investigations, or a narrow summary hides necessary reasoning. |
| Reuse investigation | The documentation inventory remains usable, with changed facts rechecked. | The agent repeats the full audit because earlier findings cannot be found. |
| Transfer decisions | Later documentation uses settled Cairn choices and knows why they were made. | It follows obsolete proposals or loses the reasoning behind the final choice. |
| Preserve open ideas | Relevant unresolved proposals can be found and reconsidered as proposals. | They disappear with the old session or are silently promoted to decisions. |
| Keep history accessible | The human can inspect the captured understanding and recover deeper discussion when needed. | A terse summary replaces the only accessible account of qualifications and rejected alternatives. |

This case should remain understandable whether continuation uses fresh sessions or compaction, and whether the work is organized as one effort or several related efforts. The required outcome is focused continuation with preserved meaning and reliable connections between the two deliverables.
