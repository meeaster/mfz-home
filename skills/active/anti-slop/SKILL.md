---
name: anti-slop
description: Use when explicitly asked to run anti-slop, or when a code-quality task specifically requests the pinned anti-slop TypeScript/JavaScript diagnostics. Inspect first and report findings; never change the target repository unless separately directed.
---

# Anti-slop

Run the globally installed, pinned upstream anti-slop Oxlint rules as a read-only diagnostic pass. This skill is portable across TypeScript and JavaScript repositories and does not install packages, copy files, read target Oxlint configuration, or write to the target.

## Procedure

1. Inspect the target path and its instructions before running diagnostics. Confirm the requested path is the directory or file to analyze.
2. Run the bundled launcher from this skill directory:

   ```bash
    node <skill-directory>/scripts/anti-slop.mjs <target-path>
   ```

    The target is the only argument. Use `--help` to see launcher usage.
3. Report the command, exit status, and every diagnostic. Treat findings as review evidence and propose fixes without editing target files.

The launcher supplies the pinned plugin and enables every upstream anti-slop rule at error severity. It runs with an isolated config, so target repository Oxlint configuration is not loaded or merged. Use a separately directed implementation workflow if the user wants findings fixed.

Upstream source: `dmmulroy/anti-slop` commit `446268e5d15baa968eaec669ff65358d36ae6259`. The vendored source and license are in this skill package.
