# Context Transfer Evaluations

**Status:** Static scenarios defined. Live invocation and execution are untested
for the initial revision.

## Shared Assertions

Every scenario confirms that the agent identifies the primary consumer,
destination context, intended use, guaranteed access, and artifact-specific
floor; carries only context that would otherwise be lost; references sources
proportionally; and respects the owning workflow's authority and publication
boundaries.

## Coworker Impact Report

**Prompt:** Create a report for a coworker explaining how account-rate changes in
the repository will affect them.

**Assertions:** The agent establishes whether the coworker can access the
repository and where the report will be consumed, leads with the impact and
confidence, explains relevant behavior instead of relying on local paths, uses
only references that help verification or follow-up, and exposes assumptions and
unanswered questions.

## Local Agent Plan

**Prompt:** Write a design and implementation plan in this repository for an
agent that will execute it later in the same workspace.

**Assertions:** The agent treats applicable repository guidance and stable local
paths as guaranteed context, preserves exact files, symbols, commands,
constraints, verification, and stop conditions, and does not replace actionable
local references with less useful generic prose.

## Native Subagent Prompt

**Prompt:** Delegate a bounded repository task to a native subagent that does not
share the parent conversation.

**Assertions:** The always-loaded subagent contract carries the objective and why
it matters, relevant priorities and tradeoffs, exact inputs, accessible paths,
constraints, authority, expected outcome, verification, and stop conditions. It
does not load `context-transfer` when audience, access, privacy, portability,
publication, and lossless handoff do not materially affect the transfer.

## Parent-To-Agent Task Brief

**Prompt:** A user gives a long spoken-style explanation of the desired product experience, why common approaches would fail, and a request to delegate implementation to a fresh agent.

**Assertions:** The agent loads `context-transfer` because the user's rationale and decision criteria are easy to flatten, reads `references/agent-briefs.md` and no unrelated branch, and preserves the objective, desired outcome, relevant rationale, themes, tradeoffs, settled constraints, accessible evidence, authority boundary, deliverable, verification, and stop conditions. It distills repetition without reducing the request to a task list or prescribing an implementation method the user did not settle.

## Specialist-To-Implementation Handoff

**Prompt:** Pass a detailed specialist design brief to an implementation agent in a fresh session, while correcting one decision that conflicts with a source-of-truth model constraint.

**Assertions:** The agent reads `references/specialist-handoffs.md` and no unrelated branch. The implementer receives the unchanged complete brief through an inline prompt or accessible file. The parent supplies a separate correction overlay that names the conflicting decision, authoritative source, and replacement. The transferred artifact retains every other actionable design decision.

## Agent On Another Machine

**Prompt:** Prepare the same plan for an agent with a fresh clone on another
machine.

**Assertions:** The agent uses repository-relative or canonical versioned
locators, removes machine-local assumptions, identifies required tools and source
revision, and carries all context not supplied by the fresh clone.

## Host Supplies The Diff

**Prompt:** Draft a change description for a reviewer on a host that already
provides the complete branch diff, commits, and checks.

**Assertions:** The agent relies on that guaranteed host context, preserves the
motivation, outcome, constraints, and review focus the diff does not communicate,
and avoids file-by-file duplication.

## Human First, Possible Agent Later

**Prompt:** Write a page for a person who may later paste it into an AI agent.

**Assertions:** The human remains the primary consumer. The artifact uses clear
structure, explicit claims, and useful references without becoming an execution
runbook unless that is also an explicit purpose.

## Distilled Minor Observation

**Prompt:** Incorporate one small repository observation that is fully explained
inside a broader report and has no continuing verification or maintenance value.

**Assertions:** The agent faithfully distills the observation without adding a
mechanical repository, file, and commit citation that provides no consumer value.

## Consequential Version-Sensitive Claim

**Prompt:** Base an implementation decision on behavior that changed between two
versions of an external project.

**Assertions:** The agent preserves the canonical source, precise artifact and
inspected version, explains its relevance, and gives the consumer a route to
detect later drift.

## Inaccessible Private Evidence

**Prompt:** Produce an external report from private evidence the recipient cannot
access.

**Assertions:** The agent follows the privacy boundary, carries only safely
disclosable meaning, states evidence limitations proportionally, and does not use
an inaccessible link as if it made the report portable. If safe sanitization or
disclosure authority is unclear, it stops and asks rather than drafting through
the uncertainty.

## Session-Derived Knowledge Owns The Form

**Prompt:** Create a Session Capture from the current conversation for a future
agent in the configured knowledge repository.

**Assertions:** `session-derived-knowledge` remains the primary workflow for
evidence, form, and session independence. `context-transfer` supplies the future
agent and repository contract without replacing Capture semantics or publication
rules.

## Handoff Owns Continuation

**Prompt:** Write a handoff so another agent can continue this work tomorrow.

**Assertions:** `handoff` remains the primary workflow and retains its temporary
destination, continuation shape, suggested skills, and redaction rules.
`context-transfer` may refine assumed workspace access but does not create a
different generic report.

## Pull Request Writer Owns Review Text

**Prompt:** Open a pull request and write its title, body, and follow-up comment.

**Assertions:** `pr-writer` remains primary and retains full-branch inspection,
snapshot-versus-timeline semantics, user refinement, and approval before GitHub
writes. `context-transfer` only identifies reviewer and host-provided context.

## Jira Writer Owns Work Item Synchronization

**Prompt:** Turn these notes into several related Jira work items and create them
after I review the local drafts.

**Assertions:** `jira-writer` remains primary and retains its flat local Markdown
artifacts, reader-first work-item semantics, metadata preflight, remote `updated`
drift check, explicit approval, dependency ordering, and verified TWG writes.
`context-transfer` does not substitute a generic artifact or bypass
synchronization.

## Confluence Writer Owns Page Publication

**Prompt:** Turn this design into a Confluence page for the team.

**Assertions:** `confluence-writer` remains primary and retains its reader-first
doctrine, authoritative HTML drafts, snapshot reconciliation, managed Markdown
copies, requested draft-mutation authority, and explicit publication gate.
`context-transfer` only supplies the audience and accessible-reference contract.

## Specialized Writer Owns The Artifact

**Prompt:** Apply context transfer while another skill owns the artifact's shape
and publishing workflow.

**Assertions:** The agent supplies the transfer contract and context lens without
replacing the owning skill's format, authority, drift check, or publication
rules. The owning skill may authorize a remote draft mutation while retaining a
separate publication gate.

## Generic Draft Is Local

**Prompt:** Draft a report for a partner organization so I can review it.

**Assertions:** The agent may draft after establishing disclosure boundaries, but
does not send, upload, commit, or publish it. It presents the artifact for review
and requires separate publication authority.

## Explicit Generic Publication

**Prompt:** Draft a report for a named recipient and send it when finished.

**Assertions:** The explicit send request supplies publication authority when no
specialized workflow applies. The agent still verifies the exact destination and
disclosure boundary and stops if privacy or sanitization remains unclear;
otherwise it may send and reports the resulting destination.

## Materially Ambiguous Destination

**Prompt:** Create a report for “someone else” without saying whether they have
repository access or where it will be delivered.

**Assertions:** The agent asks one focused question when the answer changes paths,
references, or required explanation; it does not conduct a general interview.

## Invocation

**Positive prompts:** Write this up for my coworker; preserve this context for an
agent working later; make this usable outside the current repository; turn what
we learned into a report someone else can consume.

**Adjacent ownership prompts:** Open this pull request; write a Jira story; publish
this Confluence page; create an agent handoff. The artifact-specific skill remains
primary and may use Context Transfer only as a lens.

**Adjacent negative prompts:** Answer this question in the current conversation;
fix the implementation; polish this sentence without changing its audience or
context contract; transcribe the source verbatim.
