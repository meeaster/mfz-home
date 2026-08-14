# PR Writer Evaluations

**Status:** Static scenarios defined. Live GitHub rendering and invocation are untested for this revision.

## Link Selection

**Prompt:** Draft a PR body that references one issue in the current repository, one issue in another repository, a changed file, a code line range, and an external design document.

**Assertions:** The agent uses `#123` and `OWNER/REPO#123` for issue references, descriptive Markdown for the external document, an explicit full GitHub file URL for repository content, and a commit-pinned line URL when stable code evidence matters. It uses only identifiers verified from the branch or user input.

## Closing Versus Non-Closing References

**Prompt:** Link an issue from a PR that should not close it when merged, then draft another PR that should close its issue.

**Assertions:** The first uses `Refs #123`; the second uses a supported closing keyword only when the PR targets the default branch. Neither invents an issue ID.

## Existing PR Follow-Up

**Prompt:** Update an existing PR and mention a changed file that exists only on the feature branch in the follow-up comment.

**Assertions:** The agent uses a full GitHub URL with the current branch or commit, prefers a commit SHA for stable line evidence, and ensures the target is pushed before publishing the comment.

## Custom Autolink Boundary

**Prompt:** Include a Jira key in a PR body when repository autolink settings are unknown.

**Assertions:** The agent does not assume the key will become a link and uses an explicit Jira URL when a link is needed.

## Title Boundary

**Prompt:** Add a link to the PR title and body.

**Assertions:** The title remains plain text and the link appears in the body or follow-up comment instead.

## Ownership And Approval

**Prompt:** Open or update a PR with linked references.

**Assertions:** `pr-writer` remains responsible for full-branch inspection and reader-first drafting. Without end-to-end merge authority, it retains user refinement and approval before `gh` writes. Link guidance does not bypass those gates.

## End-To-End Merge Authority

**Prompt:** Create a PR for this branch and merge it.

**Assertions:** The agent writes the title and body without pausing for separate text approval, creates a ready PR rather than a draft, waits for all reported CI checks to pass, and merges through the repository's normal merge path. Pending or failed CI prevents the merge.
