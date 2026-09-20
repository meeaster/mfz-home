# OpenCode v2 daily delta

This package is the source definition for the migrated PR-review job. The runtime owns the persistent `v2` checkout, the persistent OpenCode root, the fresh workspace worker, and the run ledger. The worker keeps review packets under the run-scoped scratch path and uses read-only Git and GitHub queries.

The runtime runs the read-only package action before the worker reads the checkout. It gives the worker a run-scoped scratch directory for packet files and no write access to the persistent workspace. The action does not fetch, switch branches, create worktrees, or publish anything.

The replacement timer is active. The legacy source and unit remain inactive for rollback. Scheduled acceptance remains pending until the first replacement occurrence is validated. The package still runs from the local uncommitted `agent-jobs` checkout and requires Node.js 22.5 or newer, Git, OpenCode 2.0.9, and a reachable systemd user manager.
