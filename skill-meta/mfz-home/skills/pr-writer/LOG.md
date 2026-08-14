# Log

## 2026-08-11 - Add GitHub Link Guidance

- Kept GitHub-native issue, pull request, and commit references as the preferred compact form where GitHub can resolve them.
- Added explicit Markdown guidance for external resources and full GitHub file URLs because repository-relative paths in PR conversation text can resolve against the conversation URL rather than the intended feature-branch content.
- Recommended commit-pinned line links when review evidence must remain stable.
- Preserved the existing user refinement and approval gate for all PR writes.

## 2026-08-11 - Recognize End-To-End Merge Authority

- Treated a request to create and merge a PR as authority to publish reader-first text without a separate approval pause and to create a ready PR.
- Required all reported CI checks to pass before every merge.
- Left merge mechanics to the repository's normal merge path rather than assuming an administrative bypass.
