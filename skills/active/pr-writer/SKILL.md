---
name: pr-writer
description: Write or refresh a GitHub PR title and description, then create, update, or merge the PR with gh under the user's authority. Use when opening or merging a PR, writing or rewriting a PR title/body, or refreshing one after the branch changed.
---

# PR Writer

Write a **reader-first** PR description — a cover note for a reviewer, not a changelog, template, or validation log. By default, draft it **in chat**: show the proposed title and body, refine with the user, then push with `gh` on approval. A request that includes merging grants end-to-end authority: write the text without a separate approval pause, create a ready PR when needed, and merge only after CI passes. There is no local artifact and no drift check — GitHub is the PR's home.

## Process

### 1. Inspect the full branch diff

Requires authenticated `gh`. Describe the *whole branch against its base*, not the latest commit or stale PR text.

```bash
git branch --show-current
git status --porcelain
BASE=$(gh pr view --json baseRefName --jq '.baseRefName' 2>/dev/null || gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
git log $BASE..HEAD --oneline
git diff $BASE...HEAD
```

For an existing PR, also read its current text: `gh pr view <N> --json number,title,body,url,baseRefName,headRefName`. Reconcile every claim against the latest full branch diff: add, remove, or rewrite description content until it represents the branch as it exists now. If on `main`/`master`, create a feature branch first.

### 2. Draft title and body in chat

Write the title and body following the doctrine below, sized to the change. For an existing PR with new branch changes, also draft a follow-up comment summarizing what changed since the previous pushed state. Present every proposed artifact to the user unless the request already grants end-to-end merge authority.

**Done when:** a reviewer could read the title alone and know what the whole branch does, the body explains the branch's current state, and any follow-up comment tells returning reviewers what changed since their previous review.

### 3. Refine with the user

Unless the request grants end-to-end merge authority, let the user react and rewrite in chat. Stay here until approved — do not touch `gh` while refining.

### 4. Push with gh

Create a draft PR by default, or update an existing one. When the user asked to merge, omit `--draft`, wait until all reported CI checks pass, and then merge through the repository's normal merge path. Pending or failed CI blocks every merge. After updating an existing PR for new branch changes, post the approved or authorized follow-up comment:

```bash
gh pr create --draft --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"

gh api -X PATCH repos/{owner}/{repo}/pulls/<N> -f title='<title>' -f body="$(cat <<'EOF'
<body>
EOF
)"

gh pr comment <N> --body "$(cat <<'EOF'
<follow-up comment>
EOF
)"

gh pr checks <N> --watch --fail-fast
gh pr merge <N>
```

Report the PR URL.

## Title

Format: `<STORY-KEY>: <subject>` — prefix the Jira story key when the work has one (e.g. `OBSERVE-453: Route dependency fetches through Artifactory`). Omit the prefix only when there is genuinely no story.

- Describe the dominant change, not the latest commit.
- No bracketed agent/tool labels (`[claude]`, `[ai]`, `[wip]`), no automation attribution, no trailing period.
- No vague titles: `update`, `cleanup`, `fix stuff`, `address feedback`.

## Reader-first doctrine

The body addresses a **reviewer** and describes the branch's current state as a coherent change. It never narrates its own creation, the instructions you were given, or how the branch evolved.

**Put in:**
- A short opening summary of the outcome and its effect.
- The context: why the change is needed, what came before, and any constraints or tradeoffs that shaped it.
- High-level bullets describing the behavioral or architectural changes.

**Form:**
- Start with the summary as prose, with no `Summary` heading.
- Follow with `## Context` in prose.
- Follow with `## What's changed` and high-level bullets.
- Size each part to the change, but keep all three parts distinct.

**Keep out** (the AI tells):
- No `Summary` or `Test Plan` headings, empty headings, or placeholders.
- No test criteria or "how it was tested" section, and no `tests were not run` — that is an instruction you were given leaking into the artifact, not content for the reviewer.
- No pasted command transcripts, CI logs, copied commit log, or file-by-file narration.
- No iteration history: superseded approaches, earlier branch states, review-fix chronology, or phrases such as `now also` and `follow-up change`.
- No process words: `this PR updates`, `decision model`, `runtime guidance`, `validation results`.
- No customer/org names, emails, secrets, or PII. No agent trace links.

## Follow-up comments

The description is the **snapshot**; comments are the **timeline**. When more changes are pushed to a branch that already has a PR, update the description to the new current state and add a new comment that preserves the review history.

- Summarize the delta since the previous pushed state or review round, not the whole PR.
- Name what was added, removed, or changed and what reviewers should revisit.
- Connect the update to review feedback when that context helps the reviewer.
- Keep earlier comments intact; each new comment records another reviewable update.
- Omit commit lists, file-by-file narration, command output, and routine implementation detail.

Example:

```markdown
Updated the account-reactivation flow based on review feedback:

- Preserved the `next` URL across reactivation instead of dropping it.
- Moved the inactive-user check into the shared login guard so GET and POST cannot diverge.
- Removed the route-specific fallback that is no longer needed.

The shared guard and redirect behavior are the main areas to revisit.
```

## Optional reviewer aids

Add only when they cut the reviewer's reconstruction work, with one sentence saying what to notice:

- **before/after** — changed contract, payload, config, or CLI surface.
- **schema/interface** — new or changed API response, type, or event shape.
- **mermaid** — async flows, queues, retries, state transitions, multi-service interaction.
- **review order** — broad, generated, or layered diffs: where to start.
- **rollout/migration note** — when adopters or operators must adjust.

## Default body shape

```markdown
<One or two sentences summarizing the outcome and its effect.>

## Context

<Why the change is needed, what came before, and the constraints or tradeoffs that shaped it.>

## What's changed

- <High-level behavioral or architectural change.>
- <Another distinct change or affected area.>
```

Example (bug fix):

```markdown
Inactive authenticated users now go through account reactivation before the login view honors a `next` URL.

## Context

The GET login path redirected authenticated users without checking `is_active`, which could bounce an inactive user between `/auth/login/` and a protected view. The POST path already enforced reactivation, so the two login paths behaved differently.

## What's changed

- Applies the existing account-reactivation guard to GET login requests.
- Preserves the requested `next` URL until the user can continue safely.
- Covers the inactive-user redirect loop with a regression test.
```

## Issue references

Use only when verified from branch name, commits, or user input — never invent IDs.

- `Fixes OBSERVE-1234` / `Fixes #1234` — closes the issue on merge.
- `Refs OBSERVE-1234` / `Refs #1234` — links without closing.

## Links in PR text

GitHub renders pull request descriptions and comments as GitHub-flavored Markdown.

- Use `[descriptive text](https://...)` for external documentation, releases, workflow runs, files, and comments. A bare valid URL is clickable, but use one only when showing the URL itself is useful.
- Use `#123` for an issue or pull request in the current repository and `OWNER/REPO#123` for one in another repository. GitHub turns these references into links and may unfurl a reference in a list or task item with its title and state.
- Use `Fixes`, `Closes`, or `Resolves` only when merging this PR should close the referenced issue. GitHub applies those keywords when the PR targets the repository's default branch. Use `Refs` for a link that must not close the issue.
- Use a full GitHub file URL for repository content, especially content introduced by the feature branch: `https://github.com/OWNER/REPO/blob/<commit-or-branch>/<path>#L10-L20`. Prefer a full commit SHA when the reference must remain stable. Do not rely on `path/to/file` or `/path/to/file` in PR text to select the feature branch.
- For code evidence, paste GitHub's permalink copied from the selected lines. GitHub can render a line-range permalink as a code snippet in conversation comments in the originating repository; cross-repository links render as URLs, and Markdown files do not get snippet rendering.
- A Jira key or other custom reference autolinks only when the repository has that custom autolink configured. If that configuration is not verified, use an explicit URL.
- Markdown links do not render in PR titles. Put links and references in the body or a follow-up comment, and verify that branch-only targets are pushed before publishing them.
