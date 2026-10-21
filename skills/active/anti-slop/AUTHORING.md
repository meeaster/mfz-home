# anti-slop

## Intent

A lightweight linter for every JavaScript and TypeScript project: a short preflight before edits so agents avoid common slop, and one read-only diagnostic checkpoint after the edit batch, using pinned upstream anti-slop rules without touching the target repository.

Not for: semantic autofixing, changing the target's dependencies or configuration, or weakening or rewriting upstream rules. Effect conventions apply only where asked for.

Success: after an ordinary JS/TS change the agent runs the checkpoint once on the narrowest relevant files, fixes in-scope findings within its existing authority, rejects suppression directives, and the launcher leaves targets unchanged except for explicit, authorized spacing fixes.

## Scenarios

- **Ordinary JS/TS change** without mentioning anti-slop: loads the preflight before editing, runs the checkpoint once after the batch on the changed files (disjoint files stay separate, not widened to a common ancestor), reruns after fixes.
- **Non-JS change**: doesn't load or run it.
- **Throwaway agent script**, such as a Node script in a temp directory written to inspect data or drive a tool: doesn't load or run it.
- **Explicit "run anti-slop on this directory"**: all pinned rules at error severity, known violations reported, target unchanged.
- **Effect codebase**: `--effect` enables the Effect rules for the whole invocation; without it they stay off regardless of the target's dependencies.
- **Readable-spacing findings during authorized implementation**: uses `--fix-spacing` instead of hand-editing, inspects the diff, handles remaining findings.
- **Same findings during review or diagnosis only**: reports them; neither fixes nor hand-edits.
- **A changed file carries an `oxlint-disable` directive**: a successful exit isn't a clean checkpoint; removes the directive and fixes the cause when authorized, otherwise reports the checkpoint as blocked.
- **Target has its own Oxlint config** that disables bundled rules or enables unrelated ones: neither applies.
- **Vendor refresh** from a new upstream commit.

## Decisions

- **Read-only launcher instead of upstream's installer** (2026-08-15). Upstream installs files and dependencies into whichever repository is current, which isn't safe or portable as a global check. Configuration lives in a temporary directory so target config is never merged.
- **Run once after the edit batch, not after every edit** (human, 2026-08-18). It's meant as a cheap final checkpoint across all projects.
- **Preflight summary before edits** (human, 2026-08-19). Agents kept writing code the linter then rejected. The summary is deliberately short to limit context cost; detail stays in the diagnostics.
- **Effect rules behind `--effect`** (human, 2026-08-19), so codebases that don't use Effect don't inherit its architecture policy. The checks are syntactic, not proof that code uses Effect.
- **Suppressions fail the checkpoint** (human, 2026-08-20). An agent added a file-level `oxlint-disable` that silently bypassed the rules; the human considers them rules agents must follow.
- **`--fix-spacing` is the only writing mode** (2026-09-10). Agents spent edits reproducing a mechanical spacing fix by hand. The fix pass gets a configuration with only the spacing rule, and always runs after a read-only pass under existing edit authority. The launcher prints a one-line stderr hint on spacing findings to steer agents to it. General `--fix`, `--config`, and other passthrough flags stay unsupported so the launcher can't drift into a general Oxlint front end with different policy.
- **Project files only** (human, 2026-10-13). Agents were running it on throwaway scripts they wrote for themselves in temp directories; the human doesn't care how those look.
- **Validate every operand before doing anything**, so a bad later path never produces a partial scan or partial fix. Operands go to Oxlint in their original order and are never widened to a common ancestor.
- **The vendored plugin isn't held to its own rules.** Its ESTree boundary code legitimately uses `unknown`, `typeof`, and assertions, and upstream excludes it from linting too. Report this as an intended exclusion; don't patch upstream bytes to silence it.
- **Single-line bindings stay grouped at every scope** (2026-10-21), following upstream PR #45. A leading comment on the next binding, a multiline binding, or a following executable statement still requires separation; existing blank lines remain untouched.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) generic and Effect plugins | untagged `13909c9e` after v0.1.2 (package version still `0.1.2`) | Vendored under `vendor/anti-slop` with the root MIT license and the nested ESLint Stylistic `LICENSE` and `UPSTREAM.md`; upstream tests, installer, skill text, and repository config are excluded. The focused local spacing integration test is `pnpm test:anti-slop`; on refresh, port relevant changes while preserving Oxlint adapters, update the vendoring record, and update the commit stamp in `SKILL.md` |
| Oxlint and `@oxlint/plugins` | major 1, resolved through `mise` | The launcher finds both with `mise where`/`mise which`; also requires the native `oxc/no-accumulating-spread` companion rule that upstream rules depend on |
