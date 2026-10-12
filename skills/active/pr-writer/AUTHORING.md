# pr-writer

## Intent

Give reviewers a coherent cover note for the whole branch and why it matters, and carry out the GitHub action the user asked for: create, update, or merge. The description is the current snapshot; follow-up comments keep the review timeline.

Not for: changelogs, validation logs, or local draft lifecycles; GitHub owns the artifact.

Success: titles and bodies that read well for a reviewer, links that resolve to the intended issue, commit, file, or line without hidden branch assumptions, and GitHub writes that match exactly what was requested.

## Scenarios

- **"Create a PR for this branch"**: inspects the full branch, writes title and body, creates a ready PR without pausing for approval, reports the URL.
- **"Create a draft PR"**: same, with GitHub draft status.
- **"Draft a PR description and show me"**: presents it in chat for refinement; no `gh` write.
- **Refresh an existing PR** after new commits: reconciles title and body with the full branch, posts a follow-up comment, keeps draft or ready status.
- **"Create a PR and merge it"**: ready PR, waits for all reported CI checks, merges through the normal path; pending or failed CI blocks the merge.
- **Links**: `#123` and `OWNER/REPO#123` for issues, full GitHub URLs for files, commit-pinned URLs for line evidence, explicit URLs for Jira keys when autolinks are unknown; `Refs` vs closing keywords chosen deliberately; no invented IDs; titles stay plain text.

## Decisions

- **Ready PR by default; draft and text-only previews only on request** (human, 2026-09-15). Earlier versions defaulted to draft or showed the text first, which added a step the human didn't want.
- **The request authorizes the named GitHub write**, so creating or updating doesn't wait for text approval. Merging still requires passing CI and the normal merge path, never an administrative bypass.
- **Full GitHub URLs for repository files** (2026-08-11). Relative paths in PR conversation text can resolve against the conversation URL instead of the feature branch.

## Sources

| Source | Revision | Local use |
|---|---|---|
| GitHub docs: [basic formatting](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), [autolinked references](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls), [permanent code links](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-a-permanent-link-to-a-code-snippet), [linking PRs to issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue) | read 2026-08-11, unpinned | Link and closing-keyword rules. When GitHub changes rendering, recheck the rendered body, not just the draft |
