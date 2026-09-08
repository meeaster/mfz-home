# Maintenance

## GitHub rendering provenance

The runtime skill depends on GitHub-flavored Markdown in PR descriptions and comments, the authenticated `gh` CLI, and the repository's current branch and commit information. Rendering behavior is sourced from GitHub's documentation:

- https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-a-permanent-link-to-a-code-snippet
- https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue

The 2026-08-11 adaptation uses full GitHub file URLs because repository-relative paths in PR conversation text can resolve against the conversation URL rather than feature-branch content. Commit-pinned line links preserve stable review evidence; compact native references remain preferable where GitHub resolves them correctly.

When GitHub changes rendering, autolinks, or closing-keyword behavior, recheck these sources and the corresponding [link evaluations](EVALS.md). Inspect the actual rendered body or comment as well as its draft. This record does not contain a live rendering result or a pinned documentation revision.
