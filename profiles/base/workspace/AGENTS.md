# Shared Workspace Instructions

## Purpose

This is a shared workspace for human and AI-assisted software work. Use it for
broad exploration, work spanning several projects, knowledge-driven tasks, and
creating new projects. Individual repositories remain independently AI-ready and
retain their own instructions and Git history.

Treat `VISION.md` as the human-owned north star for workspace structure and
policy. Check durable changes against it, and update it when an accepted direction
intentionally changes.

## Structure

- `repos/` contains workspace-managed project repositories.
- `services/` contains independently managed services and operational repositories.
- `specs/` contains independently versioned specification and planning stores.
  Each store retains its own Git history.
- `knowledge/` contains source-aware knowledge repositories and generated wikis.
- `artifacts/` contains mutable outputs that do not belong to a project repository.
- `references/` contains read-only source material. Inspect it for source-grounded
  context; never edit it in place.
- `scratch/` contains exploratory material that has not been promoted into a
  durable project or knowledge repository.
- `worktrees/` is the conventional, disposable location for isolated Git
  worktrees. Tools may use another configured location when required.

Root guidance files, including this file, `VISION.md`, `docs/`, and each
folder's `README.md` or `AGENTS.md`, are links rendered by Mindframe-Z from
`profiles/<profile>/workspace/` in the active Mindframe-Z home. Edit them there
and run `mfz apply`; edits made through the link change rendered output that the
next apply overwrites.

## Operating Modes

### Workspace Root

Work from this root for broad exploration, cross-project tasks, knowledge-driven
actions, or new-project design. Load only the repositories and source material
needed for the current goal rather than scanning everything by default.

### Project Root

Work from a project root for focused implementation. Before changing a project,
read its applicable `AGENTS.md` files and inspect its Git state. Project-level
instructions override workspace guidance for that project.

### Scratch Work

Agents may organize `scratch/` freely for temporary research and experiments.
Moving scratch work into a durable project, knowledge repository, or external
system requires review.

### Isolated Work

- Work in the current checkout by default, including when it has local changes.
  Inspect and preserve existing modifications, and coordinate edits around them.
- Create a worktree or isolated clone only when the user explicitly requests
  one. A/B tests, prototypes, automation, and local changes do not imply that
  authorization.
- Worktrees isolate files and branches, not shared stores, caches,
  configuration, or services; serialize commands that write shared state unless
  the tool provides an isolated state path.

## Autonomy And Approval

- An explicit human request authorizes work within its stated scope. Within that
  scope and the applicable repository rules, carry the task through completion
  without unnecessary confirmation.
- When an agent identifies durable work that was not explicitly requested, first
  present the proposed outcome, affected paths or repositories, important risks,
  and validation plan for approval.
- Obtain approval before creating a durable project, moving a repository,
  reorganizing persistent workspace content, deleting source material, changing
  permissions, or initiating broad cross-repository changes.
- After durable work, present the resulting commits, diffs, validation, and any
  remaining changes for final acceptance.

## Git Boundaries

- The workspace root is not a repository. Every project, service, and knowledge
  repository owns its own Git history.
- Use directory-local guidance and repository metadata to resolve ownership and
  authority. Do not infer authority from whichever checkout is nearest.
- Inspect every affected repository independently; one clean checkout says
  nothing about its neighbors.
- Do not commit, push, create pull requests, or create remotes unless the human
  request includes that action or separately approves it.

## Cross-Repository Git Status

- Run `mfz workspace status` for cross-repository status. It is read-only and lists only repositories with local changes or unpushed commits, skipping `scratch/`.
- `mfz workspace sync` fast-forwards workspace repositories on their default branch and clones declared ones that are missing. Run it only when the human asks to update repositories.
- Before committing or pushing an affected repository, inspect its own status and diff, then stage and publish only authorized, intentional changes.

## Knowledge And Source Authority

- Treat original source systems and source repositories as authoritative for
  their own information.
- Keep generated knowledge, summaries, plans, and action proposals distinguishable
  from source evidence and accepted decisions.
- Do not silently convert exploratory notes or agent proposals into commitments.
- Follow repository-specific provenance and privacy rules before moving knowledge
  across authority or privacy boundaries.

## Safety

- Never inspect, print, copy, summarize, or commit credentials, tokens, private
  keys, browser profiles, authentication stores, or secret-bearing environment
  files.
- Prefer canonical source repositories over rendered or linked configuration.
  Do not edit generated configuration when its source is known.
- Do not move or rewrite existing repositories, home-directory state, dot-folder
  state, or authoritative data merely to make the workspace look organized.
- If access is blocked, request the narrow capability needed instead of bypassing
  the boundary.
