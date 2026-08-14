# Maintenance

## Dependencies

The runtime skill depends on GitHub-flavored Markdown in PR descriptions and comments, the authenticated `gh` CLI, and the repository's current branch and commit information. Rendering behavior is sourced from GitHub's documentation:

- https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls
- https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-a-permanent-link-to-a-code-snippet
- https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue

## Change Procedure

1. Read `SKILL.md` and every file in this authoring record before changing behavior.
2. Recheck GitHub documentation when link rendering, autolinks, or closing-keyword behavior changes.
3. Keep link guidance subordinate to the reader-first PR shape and authority rules.
4. Update the relevant static evaluations and record consequential decisions in `LOG.md`.
5. Edit the source skill, run `mfz apply --target all --agent all`, then run `mfz skills list` and `mfz doctor`.

## Verification

Static review must confirm valid front matter, clear distinctions between native references and Markdown links, no invented identifiers, no title-link guidance, and a CI-pass gate for every merge. Representative execution should inspect the drafted body and comment before any GitHub write.
