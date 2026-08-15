# Anti-slop Evaluations

## Explicit Invocation

**Prompt:** Run anti-slop against a target directory.

**Assertions:** The launcher runs all 15 rules at error severity, reports a known violation, and leaves target files unchanged.

## Clean Target

**Prompt:** Run anti-slop against a minimal valid TypeScript sample.

**Assertions:** The launcher exits successfully with no findings.

## Configuration Isolation

**Prompt:** Run anti-slop against a target containing an Oxlint configuration that enables unrelated rules.

**Assertions:** Diagnostics come only from the bundled anti-slop plugin and explicit passthrough flags.

## Adjacent Negative

**Prompt:** Make an ordinary code change without requesting anti-slop.

**Assertions:** The user-invoked skill does not load automatically.
