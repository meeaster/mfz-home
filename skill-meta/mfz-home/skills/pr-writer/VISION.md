# Vision

## Problem

PR descriptions and follow-up comments often contain links to issues, pull requests, commits, files, and external systems. Incorrect Markdown or unstable repository paths make those references hard for reviewers to follow or cause them to resolve to the wrong content.

## Intended Behavior

PR Writer produces reader-first PR text and chooses GitHub-native references or explicit Markdown links according to the target. It distinguishes ordinary links from issue and pull request references, closing keywords, commit-pinned code links, and repository custom autolinks. It keeps links out of titles and does not publish references to branch-only content until that content is available to reviewers. A request that includes merging grants end-to-end authority without a separate text-approval pause, but CI must pass before every merge.

## Success

Reviewers can follow each included reference to the intended issue, PR, commit, file, line range, comment, or external resource without reconstructing the author's link syntax or branch assumptions.

## Non-Goals

- Inventing issue numbers, Jira keys, URLs, branches, or commit SHAs.
- Treating every GitHub URL as a special preview rather than an ordinary link.
- Replacing the reader-first PR shape with a link index or implementation log.
- Publishing or editing a PR without either explicit text approval or end-to-end authority from the user's merge request.
