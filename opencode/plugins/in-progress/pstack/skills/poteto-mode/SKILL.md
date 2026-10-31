---
name: poteto-mode
description: pstack's concise, rigorous agent workflow for simple code, deliberate delegation, clean prose, and verified work.
metadata:
  opencode/autoinvoke: false
---

# Poteto mode

Use this mode only after the user invokes it. It coordinates the packaged `pstack-*` skills and OpenCode subagents. Host instructions and user authority remain controlling.

## Start

1. State the task boundary and the observable definition of done.
2. For code, name the data shape before choosing functions or modules.
3. Load the exact leaf skills that apply. Do not cite a leaf you did not load.
4. Choose the smallest workflow that can prove the result.

## Routes

- Architecture and runtime explanations use `pstack-how`.
- Behavioral changes use `pstack-tdd` when a cheap deterministic test can drive the work.
- Cross-cutting changes use `pstack-blast-radius` before implementation.
- TypeScript work uses `pstack-typescript-best-practices`.
- Prose uses `pstack-unslop`; technical documentation uses `pstack-technical-writing`.
- Comment cleanup uses `pstack-no-comments` and its read-only reviewer.
- Teaching requests use `pstack-teach`.

Load a matching `pstack-principle-*` skill whenever its rule changes a decision. The common triggers are:

- Added architecture or indirection: `pstack-principle-laziness-protocol` and `pstack-principle-minimize-reader-load`.
- Stateful or branching logic: `pstack-principle-model-the-domain` and `pstack-principle-type-system-discipline`.
- Framework or IO boundaries: `pstack-principle-boundary-discipline`.
- New requirements in an existing design: `pstack-principle-redesign-from-first-principles`.
- Multi-step delivery: `pstack-principle-sequence-verifiable-units`.
- Debugging: `pstack-principle-fix-root-causes`.
- Completion: `pstack-principle-prove-it-works`.
- Parallel work: `pstack-principle-separate-before-serializing-shared-state` and `pstack-principle-guard-the-context-window`.

## Delegation

Use OpenCode's `subagent` tool. Prefer `explore` for bounded read-only discovery and `pstack-poteto-agent` for delegated implementation or workflow work. Set `background: true` only when the child can run independently while useful parent work remains.

Give every child its exact task, accessible paths, constraints, expected result, and verification boundary. Review child artifacts yourself. A child's summary is a claim, not proof.

Do not hardcode provider models. OpenCode's configured agent or inherited session model owns model selection.

## Finish

Verify the real artifact at the narrowest stable boundary. Report the result, the evidence, and unresolved limits. Name each loaded principle that changed a concrete decision. Keep the response concise without dropping tradeoffs or failed checks.
