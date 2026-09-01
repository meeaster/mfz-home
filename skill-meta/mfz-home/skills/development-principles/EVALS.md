# Development Principles Evaluations

## Explicit Invocation

**Prompt:** Load `development-principles` and review an implementation for maintainability.

**Assertions:** The skill loads successfully, uses the development-principles name, and applies happy-path-first design, evidence-based complexity, phase-aware scope, stable-boundary tests, and bounded code-health improvement.

## Implementation Request

**Prompt:** Make an ordinary software implementation change without prescribing architecture, formatting, or verification.

**Assertions:** The agent loads the globally required skill, inspects existing context first, keeps the happy path prominent, scans material risks, avoids speculative abstractions, surfaces bounded code-health improvements, and preserves repository conventions.

## Readable Project Evolution

**Prompt:** Add successive commands or use cases to an existing local application whose handlers have started accumulating multiple workflow steps.

**Assertions:** The agent keeps orchestration visually scannable, places logical actions and control-flow bodies on separate lines, uses the repository formatter when available, and does not treat fewer physical lines as lower complexity. Bounded cleanup may improve the touched command boundary without expanding into an unrelated rewrite.

## Design-Time Boundary Decision

**Prompt:** Design a feature that will extend a cohesive domain concern currently exported from an executable entrypoint and covered by direct unit tests.

**Assertions:** The design surfaces the existing boundary evidence, evaluates whether a domain-named module or folder change lowers total navigation, dependency, and testing cost, distinguishes structural maintenance from required product behavior, and explicitly records whether the accepted scope changes the current file layout or keeps it. It does not use file length alone or propose a generic utility file.

## Accepted Design Implementation

**Prompt:** Implement an accepted design that assigns a cohesive domain concern to its own module.

**Assertions:** The agent follows the accepted boundary, keeps unrelated structure unchanged, preserves behavior and direct tests, and reports a contradiction instead of silently discarding or redefining the design.

## Narrow Feature Without Design

**Prompt:** Make a small behavior change in an area with evidence for a larger file-boundary improvement but no accepted structural decision.

**Assertions:** The agent keeps the feature change bounded, surfaces the structural evidence as a concrete follow-up, and does not silently expand the request into unrelated reorganization.

## Verification Against Design

**Prompt:** Verify an implementation against an accepted design that includes persistence, testing, documentation, and module-boundary decisions.

**Assertions:** The agent checks each accepted decision against artifacts and behavior, identifies missing structure or stale documentation as implementation drift, and leaves the human or coordinating agent a clear accept, remediate, or defer decision.

## Coordinated Project Evolution

**Prompt:** Coordinate several ordinary feature workers against one evolving project while retaining authority to make routine project-level decisions.

**Assertions:** The coordinating agent keeps feature prompts human-like and outcome-focused, independently inspects artifacts, retains concrete code-health findings across workers, distinguishes accepted design drift from newly discovered maintenance, and schedules focused remediation only after enough evidence and within its authority.

## Greenfield Test Foundation

**Prompt:** Build a new local application with domain behavior, persistence, and a user-facing command or API without prescribing tests or verification tools.

**Assertions:** The agent establishes a minimal native test runner and independently runnable unit and integration scripts with the initial implementation, makes the conventional default test command run only the fast unit lane, adds focused integration coverage behind an explicit command, provides an aggregate full-suite command, and records when agents should run each lane in root project guidance when the boundary is not already documented.

## Existing Project Without Tests

**Prompt:** Change an existing project that has no durable test infrastructure.

**Assertions:** The agent explicitly evaluates setup cost, behavioral risk, and likely future reuse. It adds a small native test foundation when the change introduces durable logic, parsing, persistence, migration, state-transition, or boundary risk. When that value does not justify setup, it performs focused verification and reports why no durable test was added.

## Observed Regression

**Prompt:** Fix a reproduced behavioral defect in an existing project.

**Assertions:** The agent adds a regression test at the narrowest stable boundary that fails for the observed defect and passes after the fix, while retaining any appropriate broader integration coverage.

## Integration Runtime Pressure

**Prompt:** Extend a project whose integration suite is becoming slow while its domain behavior has many input variations.

**Assertions:** The agent keeps combinatorial behavior in the independently runnable unit lane, keeps the conventional default test command on that fast lane, retains only representative real-boundary integration coverage behind an explicit command, uses observed runtime evidence before restructuring the suite, and does not duplicate the complete unit matrix through slower integration fixtures.

## Adjacent Negative

**Prompt:** Complete an ordinary request that does not design, implement, test, refactor, or review software.

**Assertions:** The global routing instruction does not load development-principles for unrelated work.
