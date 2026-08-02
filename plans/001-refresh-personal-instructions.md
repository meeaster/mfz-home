# Plan 001: Refresh Personal Instruction References

> **Executor instructions**: Follow this plan in order. Run each verification
> command before continuing. If a STOP condition occurs, stop and report it;
> do not improvise. Update this plan's row in `plans/README.md` when finished.
>
> **Drift check (run first)**: `git diff --stat df68ecc..HEAD -- AGENTS.md opencode/agents/research.md skills/active/adversarial-code-review/SKILL.md skills/active/quality-garden/SKILL.md docs/deepswe-opencode.md skills/active/mise/SOURCES.md skills/active/mise/SPEC.md`
> If an in-scope file changed since this plan was written, compare it with the
> current-state excerpts below. Treat a material mismatch as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `df68ecc`, 2026-08-01

## Why This Matters

The Personal Mindframe-Z home contains active guidance that still names retired
paths, an obsolete branch name, and prior OpenCode model routing. Agents can
therefore search a duplicate reference tree, fail on repositories whose default
branch is `main`, or select an older OpenCode model despite the current Luna,
Terra, and Sol routing policy. This plan makes the source-of-truth instructions
match the active Personal profile without changing profile behavior itself.

## Current State

- `AGENTS.md` is the repository-maintenance guide. It incorrectly says profile
  instructions come from root `AGENTS.md` (line 10), says Personal overrides
  Node to 26 even though Base also pins Node 26 (line 27), omits the currently
  selected `implement-design` command (line 44), and names retired
  `~/.claude/threads` storage (line 51).
- `profiles/base/profile.yml:3-4` selects `instructions/AGENTS.md`; the
  Personal overlay adds `instructions/PERSONAL.md` at
  `profiles/personal/profile.yml:4-5`. `profiles/base/mise.toml:2` and
  `profiles/personal/mise.toml:2` both set Node 26. The effective Personal
  external-folder list is in `~/.mindframe-z/extra_folders.md` after apply.
- `opencode/agents/research.md:16-19,64-69` permits and instructs research
  under `~/references`, while `AGENTS.md:50` establishes
  `~/workspace/references` as the authoritative clone root. These are separate
  directories on this machine.
- `skills/active/adversarial-code-review/SKILL.md:21,31,38-40` hard-codes
  `master` and `openai/gpt-5.5`. The current home branch is `main`. The
  configured quality reviewer is Sol high; see
  `docs/model-selection.md:65-85` and
  `profiles/personal/mise.toml:8-9`.
- `skills/active/quality-garden/SKILL.md:45,77` selects OpenCode GPT-5.5 for
  the gardener. The same current model policy uses Luna for bounded execution
  with Sol as the configured advisor. Its fallback at line 204 names the
  nonexistent repository-relative `skills/pr-writer/SKILL.md`; the local source
  is `skills/active/pr-writer/SKILL.md`, and `pr-writer` is enabled already.
- `docs/deepswe-opencode.md:57-67` gives a retired absolute home path even
  though the referenced directory exists at
  `tools/deepswe/pier-sitecustomize/` in this repository.
- `skills/active/mise/SOURCES.md:8-14,21-22` points to removed
  `~/.agents/skills/skill-writer` and `skills/mise/`. The canonical vendored
  skill source is `skills/vendor/skill-writer/`, the local Mise skill is
  `skills/active/mise/`, and the structural validator is
  `skills/vendor/skill-writer/scripts/quick_validate.py`.

## Commands You Will Need

| Purpose | Command | Expected On Success |
| --- | --- | --- |
| Source checks | `git diff --check` | Exit 0 with no output |
| Typecheck | `pnpm typecheck` | Exit 0 with no errors |
| Plugin tests | `pnpm test` | All Vitest tests pass |
| Validate Mise skill | `uv run skills/vendor/skill-writer/scripts/quick_validate.py skills/active/mise` | Structural validation succeeds |
| Apply after acceptance | `mfz apply --target all --agent all` | Canonical runtime files are rendered and linked |
| Validate applied home | `mfz doctor` | Profile manifests and managed links are valid |

## Scope

**In scope**:

- `AGENTS.md`
- `opencode/agents/research.md`
- `skills/active/adversarial-code-review/SKILL.md`
- `skills/active/quality-garden/SKILL.md`
- `docs/deepswe-opencode.md`
- `skills/active/mise/SOURCES.md`
- `skills/active/mise/SPEC.md`
- `plans/README.md`

**Out of scope**:

- `profiles/base/profile.yml` and `opencode/commands/implement-design.md`.
  They are existing uncommitted changes; update only the guide's inventory to
  describe the currently selected command.
- `profiles/personal/mise.toml`. Its Sol-high advisor change is already
  correct and must not be altered.
- `skills/archive/thread-log/`; it is inactive historical material.
- Plugin source and OpenCode runtime dependency declarations; they are not
  instruction-reference fixes.

## Git Workflow

- Work in the dispatcher's isolated worktree and branch.
- Do not commit, push, open a PR, or run `mfz apply` from the isolated
  worktree. Applying there would alter the operator's global configuration.
- Use Conventional Commit style if the operator later requests a commit.

## Steps

### Step 1: Correct the home maintenance guide

In `AGENTS.md`:

1. Replace the claim that profiles load root `AGENTS.md` with an accurate
   statement that `profiles/*/profile.yml` declares profile instructions, with
   Base selecting `instructions/AGENTS.md` and Personal adding
   `instructions/PERSONAL.md`.
2. State that Base provides Node 26 and pnpm 11, and Personal retains Node 26,
   rather than claiming Personal overrides it.
3. Add `implement-design` to the installed OpenCode command inventory beside
   `apply-spec` and `rmslop`.
4. Replace the stale external-folder list with the effective Personal list:
   `~/.mindframe-z`, `~/.agent/diagrams`, `/tmp/compound-engineering`,
   `/home/mark/workspace/specs/workspace-specs`, and
   `/home/mark/workspace/knowledge/personal-knowledge`.

Keep the existing concise bullet style; do not rewrite unrelated sections.

**Verify**: `rg -n --fixed-strings '~/.claude/threads' AGENTS.md` returns no
matches, and `rg -n --fixed-strings 'implement-design' AGENTS.md` returns one
inventory entry.

### Step 2: Route research to the authoritative reference tree

In `opencode/agents/research.md`, replace both `~/references` references with
`~/workspace/references`, including the `external_directory` permission glob.
Keep the existing local-references-first research order and read-only agent
permissions intact.

**Verify**: `rg -n --fixed-strings '~/references' opencode/agents/research.md`
returns no matches, and `rg -n --fixed-strings '~/workspace/references'
opencode/agents/research.md` returns the permission and prose references.

### Step 3: Refresh active review and gardening skill defaults

In `skills/active/adversarial-code-review/SKILL.md`:

1. Resolve the repository default branch once with
   `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`, store
   it in a shell variable, and use that variable for the merge-base calculation
   and both panel prompts. Do not retain a hard-coded `master` assumption.
2. Rename the OpenCode panel member from GPT-5.5 to GPT-5.6 Sol and use
   `-m openai/gpt-5.6-sol --variant high` in its command. Preserve the separate
   Claude Opus panel member and the two-engine adjudication design.

In `skills/active/quality-garden/SKILL.md`:

1. Change the gardener default and example command to
   `openai/gpt-5.6-luna` with `--variant max`, matching the current bounded
   executor policy while leaving the configured Sol advisor available.
2. Remove the obsolete `skills/pr-writer/SKILL.md` fallback path. Retain the
   instruction to load `pr-writer` when it is available and otherwise follow
   its reader-first doctrine.

**Verify**: `rg -n 'git merge-base HEAD master|against master|openai/gpt-5\.5|skills/pr-writer/SKILL\.md' skills/active/adversarial-code-review/SKILL.md skills/active/quality-garden/SKILL.md` returns no matches. `rg -n --fixed-strings 'openai/gpt-5.6-sol' skills/active/adversarial-code-review/SKILL.md` and `rg -n --fixed-strings 'openai/gpt-5.6-luna' skills/active/quality-garden/SKILL.md` each return the updated default.

### Step 4: Repair non-runtime operational and provenance documents

1. In `docs/deepswe-opencode.md`, update `PIER_SITECUSTOMIZE` to
   `$HOME/workspace/repos/mindframe-z-personal-home/tools/deepswe/pier-sitecustomize`.
2. In `skills/active/mise/SOURCES.md`, replace the removed absolute
   `skill-writer` source and all its relative reference entries with
   `skills/vendor/skill-writer/...` paths. Update the adopted local skill path
   to `skills/active/mise/`.
3. In `skills/active/mise/SPEC.md`, make the skill-writer source and validation
   command explicit using repository-relative paths. The validator command is
   `uv run skills/vendor/skill-writer/scripts/quick_validate.py skills/active/mise`.

Do not alter the runtime guidance in `skills/active/mise/SKILL.md`.

**Verify**: `rg -n 'mindframe-z/homes/personal|/home/mark/\.agents/skills/skill-writer|skills/mise/' docs/deepswe-opencode.md skills/active/mise` returns no matches.

### Step 5: Validate source changes and hand off application

Run the source-level checks from the commands table. Update plan 001 in
`plans/README.md` to `DONE` only after all checks pass.

Then report the changed files and successful checks to the operator. The
operator must apply the accepted source changes from the canonical checkout:

```bash
mfz apply --target all --agent all
mfz doctor
```

After that application, confirm the rendered
`~/.mindframe-z/configs/personal/AGENTS.md` contains the updated extra-folder
list and no `~/.claude/threads` reference.

**Verify**: `git diff --check`, `pnpm typecheck`, `pnpm test`, and the Mise
skill validator all succeed.

## Test Plan

- No behavior-specific test is required because this changes guidance and
  source documentation only.
- Run the existing `pnpm typecheck` and `pnpm test` gates to catch incidental
  repository regressions.
- Run the vendored structural validator for the maintained Mise skill metadata.
- After accepted source changes are applied canonically, run `mfz doctor` to
  verify managed manifests and links.

## Done Criteria

- [ ] No in-scope source contains `mindframe-z/homes/personal`, `~/references`,
  `~/.claude/threads`, `git merge-base HEAD master`, `against master`,
  `openai/gpt-5.5`, or `skills/pr-writer/SKILL.md`.
- [ ] `AGENTS.md` accurately names profile instruction sources, current Node
  ownership, all three selected OpenCode commands, and effective Personal
  extra folders.
- [ ] The research agent allows and instructs `~/workspace/references`.
- [ ] Adversarial review uses a repository default branch and GPT-5.6 Sol high;
  quality gardening uses GPT-5.6 Luna max.
- [ ] DeepSWE and Mise provenance paths resolve within this repository.
- [ ] `git diff --check`, `pnpm typecheck`, `pnpm test`, and the Mise skill
  validator succeed.
- [ ] No out-of-scope files are modified by the executor.
- [ ] The operator runs `mfz apply --target all --agent all` and `mfz doctor`
  after accepting the source changes.

## STOP Conditions

Stop and report if:

- Any in-scope excerpt materially differs from the current state.
- The `implement-design` command is removed from the active profile before the
  guide inventory is updated.
- The configured OpenCode model policy no longer documents Luna as executor and
  Sol as reviewer; do not invent a replacement model.
- The default branch cannot be resolved through `gh`, or the skill must support
  repositories without GitHub metadata; request the desired fallback policy.
- Any source validation command fails twice after a reasonable, in-scope fix.

## Maintenance Notes

- Keep model names in active skills aligned with `profiles/*/profile.yml` and
  `docs/model-selection.md` whenever routing changes.
- Prefer default-branch discovery over hard-coded `main` or `master` in skills
  intended to run across repositories.
- Treat source paths in operational docs and skill provenance as maintained
  documentation; move them whenever the home layout changes.
