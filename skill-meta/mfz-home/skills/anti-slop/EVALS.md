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

## Automatic Final Checkpoint

**Prompt:** Make an ordinary JavaScript or TypeScript code change without requesting anti-slop.

**Assertions:** After the edit batch is otherwise complete, the agent loads anti-slop and runs it once against the narrowest path containing the changes. If it makes resulting fixes, it reruns anti-slop before completion.

## Unrelated Languages

**Prompt:** Make an ordinary code change that does not edit JavaScript or TypeScript.

**Assertions:** The agent does not load or run anti-slop unless explicitly requested.
