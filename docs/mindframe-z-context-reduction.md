# Mindframe-Z context reduction

Status: implemented and under observation.

This document records the work that reduced always-loaded Mindframe-Z context and added progressive disclosure for instructions, references, and extra folders. It captures the decisions, implementation, validation, and remaining follow-up from the August and September 2026 work sessions.

## Goal

The original configuration put too much routing detail into every agent session. The work keeps the information available while moving detail behind task-relevant pointers.

The design has two requirements:

- Agents must know enough about available tools, repositories, knowledge stores, and artifacts to recognize when a capability applies.
- Agents must not receive every path, permission, repository description, and specialist workflow on every task.

Benchmarks were intentionally deferred. The first evaluation period uses normal work and checks whether the new triggers load the right detail when needed.

## Decisions

### Keep full indexes authoritative

Mindframe-Z continues to generate the complete indexes:

- `~/.mindframe-z/references.md`
- `~/.mindframe-z/extra_folders.md`

These files retain repository descriptions, URLs, paths, permissions, and other detail. The progressive-disclosure work adds compact and grouped views without replacing them.

### Use on-demand instruction references

Detailed guidance that does not apply to every task moved out of the always-loaded instructions:

- Browser automation guidance moved to `instructions/BROWSER.md`.
- Personal knowledge guidance moved to `instructions/PERSONAL_KNOWLEDGE.md`.
- Work service, Jira, Confluence, Datadog, and artifact guidance moved to `instructions/WORK_SERVICES.md`.

The base and Work instructions contain trigger-focused pointers. Mindframe-Z copies the referenced files into the rendered profile and keeps the pointer descriptions in global instructions.

Each `instruction_references` entry has a stable kebab-case `name`, a source `path`, and a trigger-focused `description`.

### Reserve `context-transfer` for consequential boundaries

Routine delegation no longer requires every agent to load the full `context-transfer` skill. The always-loaded instructions now define a compact brief contract for ordinary subagent work.

`context-transfer` remains the detailed workflow for transfers where audience, access, privacy, portability, publication, or lossless specialist handoff changes what the receiving consumer must know.

The skill now has two progressive branches:

- `skills/active/context-transfer/references/agent-briefs.md` contains the detailed routine brief guidance.
- `skills/active/context-transfer/references/specialist-handoffs.md` contains the detailed lossless specialist handoff guidance.

The shared `SKILL.md` keeps the common transfer contract and the decision rules for choosing a branch.

### Generate grouped capability files from profile metadata

The lists of references and extra folders are generated from Mindframe-Z profile metadata. They are not maintained as handwritten routing instructions.

Profiles can declare `capability_groups`. References and extra folders selected by a grouped profile must declare:

- A matching `group`.
- A short `summary` for the awareness view.
- At least one `signal` that can trigger detailed lookup.

The renderer generates:

- `~/.mindframe-z/capabilities/index.md` as the compact awareness map.
- One detailed Markdown file for each active group.

The current groups are:

- `agent-tooling`
- `public-safety-aws`
- `public-safety-observability`
- `public-safety-products`
- `knowledge-and-artifacts`

The awareness map includes each group summary, entry summaries, a small set of trigger signals, and the path to the detailed group file. Detailed files include full entry descriptions, URLs, paths, and extra-folder permissions.

Profiles without `capability_groups` keep the previous full-index behavior. This preserves the existing renderer contract for other homes while the Personal and Work homes use grouped disclosure.

## Implementation

### Mindframe-Z engine

The implementation lives in `/home/mark/workspace/repos/mindframe-z`.

- `src/core/manifests.ts` defines capability metadata and the `capability_groups` schema.
- `src/core/profile.ts` merges capability groups by name during profile inheritance.
- `src/core/paths.ts` defines the generated capability directory and file paths.
- `src/ref-store/capabilities.ts` validates metadata, renders awareness and detail files, and removes stale generated group files.
- `src/core/render.ts` uses the compact capability index when a profile enables grouped disclosure.
- `src/renderers/agents-doc.ts` inlines the compact index for renderers that cannot follow imports.
- `src/cli/apply.ts` generates capability files during normal apply.
- `src/cli/mfz.ts` makes `mfz refs index` regenerate the reference, extra-folder, and capability indexes.
- `src/cli/init.ts` documents the metadata fields for new homes.
- Generated JSON schemas include the new reference, extra-folder, and profile fields.

The validation path rejects missing metadata and unknown groups. It does not alter access permissions or add implicit folder grants.

### Personal and Work homes

The active metadata lives in these repositories:

- `/home/mark/workspace/repos/mfz-home`
- `/home/mark/workspace/repos/easterly-mfz-home`

The profiles classify active references and extra folders into the five groups. Existing descriptions and URLs remain in the source files. Existing read and edit permissions remain unchanged.

## Results

The Work profile changed as follows:

- Work `AGENTS.md` was 19,256 characters after the first instruction reduction.
- Work `AGENTS.md` is 8,872 characters after grouped capability disclosure.
- The compact capability index is 2,815 characters.
- The full reference index is 5,295 characters.
- The full extra-folder index is 7,756 characters.
- Five detailed group files are generated under `~/.mindframe-z/capabilities/`.

The earlier instruction reduction changed Work `AGENTS.md` from 22,187 to 19,256 characters. The final grouped design keeps the full indexes available without inlining them into global instructions.

## Validation

The following checks passed during the implementation:

- `pnpm check` in `mindframe-z`, including the full source test suite.
- Focused capability, profile inheritance, renderer, and OpenCode V2 tests.
- The focused apply integration test for compact awareness and detailed group files.
- Generated schema validation through `pnpm schemas`.
- `git diff --check` in the affected repositories.
- Anti-slop diagnostics on every changed TypeScript and JavaScript source or test path.
- Live `mfz apply` for the Work profile.
- Live `mfz doctor` for the Work profile.
- Checks that all five detailed group files exist, the compact index is present, and full indexes remain available.

The live Work instructions contain `# Available Workspace Capabilities` and no longer inline `# Enabled References` or `# Extra Folders`.

## Known gaps

- The existing integration suite still has an unrelated OpenCode V2 TUI migration failure. Its assertion expects the old `tui/index.tsx` path instead of the copied package directory.
- The Personal home remains dirty from concurrent MFZ and OpenCode work. `mfz apply` warns and skips pulling the dirty upstream home.
- No commits were created for this work.

## Follow-up

Evaluate the routing during normal use before changing the group model again. Check whether agents recognize the compact signals and open the correct detailed group or on-demand instruction file.

The next larger design question is whether other capability areas need grouped files. Review skills and MCPs separately before adding them to this disclosure model. Do not replace the full indexes or access configuration with a compact map.

## Session evidence

The related V1 OpenCode session `ses_0275f35d8ffeTrYfthd6AgD6y8` in `~/.local/share/opencode/opencode.db` established the earlier decisions about TWG, local Markdown artifacts, `context-transfer`, and session work captures. The grouped capability implementation and final validation were completed in the active OpenCode V2 continuation.

This document is a durable record of the resulting decisions and state. It does not require the source session for ordinary use.
