---
name: context-transfer
description: Preserve meaning when context moves into an artifact for a different consumer or environment. Use when creating or revising content for a consumer who will not share all of the current conversation, workspace, access, or assumptions, or when another skill needs to decide what must cross that boundary. When an artifact-specific skill applies, keep it primary and use this only as its context lens.
---

# Context Transfer

Fit an artifact to the context in which it will be consumed. Do not maximize
self-containment or portability by default; preserve exactly the context required
after the transfer boundary.

## 1. Establish The Transfer Contract

First inspect the available skills and destination instructions for an
artifact-specific owner. Load and follow that owner when one applies; this skill
supplies its transfer contract and never replaces its artifact semantics,
storage, drift checks, approval gates, or publication workflow.

Identify:

- the source context where the understanding was developed;
- the primary consumer: human, agent, or mixed;
- the destination and context its host supplies;
- the intended use: understand, decide, review, implement, continue, or preserve;
- repositories, systems, tools, and references the consumer can reliably access;
- the artifact's expected lifetime, privacy boundary, and authority.

Use this as a working contract for creating the artifact, not as a required
section of the output. Carry contract details into the artifact only when the
consumer needs them to understand, evaluate, or use the result.

If another skill or repository owns the artifact, read its instructions and treat
its independence requirements as a minimum floor. Infer the contract from the
request and destination when the evidence is clear. Ask only when an unresolved
distinction would materially change the artifact. Stop and ask when unresolved
privacy, disclosure, or publication authority could expose protected context.

**Done when:** every context assumption that affects content or references is
either guaranteed or identified as crossing the boundary.

## 2. Determine What Must Cross

Use this relation:

```text
context to carry
= context required for the intended use
- context reliably supplied by the destination and consumer
```

Classify relevant context as:

- supplied by the artifact's host;
- already and reliably available to the consumer;
- necessary to explain or include;
- better kept as an accessible reference;
- inappropriate for the destination and therefore omitted or sanitized.

If required meaning cannot cross the boundary safely, stop and report the
conflict rather than weakening the privacy boundary or silently producing an
incomplete artifact.

Intentional dependencies are valid when the transfer contract guarantees them.
Remove accidental dependencies on the current conversation, hidden assumptions,
unavailable systems, transient state, or one machine's paths.

**Done when:** everything required for the intended use has one valid route into
the consumer's context and irrelevant production context has none.

## 3. Shape For The Consumer

For a primarily human or mixed consumer, read
[`references/human-consumers.md`](references/human-consumers.md).

For a primarily agent consumer, preserve exact inputs, accessible paths or
locators, versions, constraints, authority boundaries, expected outcomes,
verification, and stop conditions needed for reliable action. Greater detail is
useful only when it changes execution.

The consumer axis and environment axis are independent. Local paths can be the
best references for an agent guaranteed the same workspace and broken references
for a human receiving a detached report.

**Done when:** the artifact's density, terminology, and structure fit its primary
consumer without blocking declared secondary use.

## 4. Reference Proportionally

Distillation can remove a source dependency. Preserve a reference only when the
source remains useful for:

- using or acting on the artifact;
- establishing authority or attribution;
- verifying or challenging a consequential claim;
- recovering intentionally omitted detail;
- detecting version drift;
- continuing or revising the work.

Use the least reference depth that serves that purpose: no reference, source
name, canonical artifact, precise section or symbol, version-pinned locator, or
included relevant material. A local path is valid when the transfer contract
guarantees that environment; otherwise use an accessible locator or carry the
needed meaning into the artifact.

Do not preserve a bibliography of where every small observation originated. If
the artifact faithfully incorporates a minor fact and the source no longer helps
the consumer use, trust, verify, or revise it, omit the reference.

**Done when:** every included reference earns its place and no omitted reference
leaves a required dependency hidden.

## 5. Produce Through The Owning Workflow

For artifact workflow ownership, generic artifact creation, or write authority,
read
[`references/artifact-workflows.md`](references/artifact-workflows.md).

## 6. Run The Cold-Consumer Test

Evaluate the artifact from the intended destination, not from the context that
produced it. Given only the artifact, its host-provided context, and its declared
accessible references, verify that the intended consumer can complete the stated
use without reconstructing the source conversation.

Check that every remaining assumption is deliberate, every required reference is
reachable at the promised level, and every omitted detail is genuinely
unnecessary or explicitly bounded. Report unresolved access, evidence, privacy,
or freshness limitations. Do not publish while a privacy, disclosure, or
authorization limitation remains unresolved.

**Done when:** the intended consumer can use the artifact within the declared
contract and every remaining limitation is visible.
