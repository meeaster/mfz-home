---
name: work-context
description: Work-unit context operations. Use when a prompt names a work unit to load, durable work should be attached, the active phase or orientation changes, scope drift suggests switching or detaching, or the user asks to inspect or checkpoint work context.
---

# Work Context

Work context is filesystem-first: Markdown holds authored context, the CLI enforces lifecycle invariants, and the OpenCode plugin supplies awareness.

## 1. Load Named Context

When the prompt names a work unit, treat it as supplemental background, not as the task itself. The
delegation prompt must still state the work, scope, constraints, and expected result.

Run `mfz work show <slug> --json` and `mfz work status <slug> --json`, then read the returned
`orientation.md` and `context-map.md`. Load deeper pointers only when the task needs them. Do not
attach the current session merely because the prompt named a unit.

## 2. Inspect The Current Session

Resolve the current OpenCode session ID, then run:

```bash
mfz work context --session opencode:<session-id> --json
```

Stop when the active unit and freshness are known. Unbound trivial work needs no unit.

## 3. Choose The Lifecycle Operation

- Inspect: use `mfz work show`, `status`, `checkpoints`, or `receipts`.
- Create: propose a unit for durable work, then run `mfz work create <slug>` after confirmation.
- Attach, switch, or detach: treat an explicit user request as confirmation; otherwise ask once before mutation.
- Phase: use `mfz work phase <slug> --phase <phase>` when the work's descriptive phase changes.
- Checkpoint: follow the CLI workflow:

  ```bash
  mfz work instructions checkpoint <slug>
  mfz work validate <slug>
  mfz work status <slug> --json
  mfz work context --session opencode:<session-id> --json
  ```

Never infer a binding change from scope drift. Propose the operation and preserve the current binding until confirmed.

## 4. Author Context

Run `mfz work instructions update <slug>`, edit the returned `orientation.md` and `context-map.md` files directly, then run:

```bash
mfz work validate <slug>
mfz work status <slug> --json
mfz work context --session opencode:<session-id> --json
```

Done when validation passes and the re-read state reflects the intended unit, phase, and freshness.
