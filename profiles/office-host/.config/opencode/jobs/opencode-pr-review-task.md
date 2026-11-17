Send a daily delta for the `anomalyco/opencode` `v2` branch. Compare newly merged pull requests and meaningful branch changes since the previous daily report, summarize the most important behavior changes, call out notable open pull requests that are likely to affect `v2` soon, and prioritize changes that materially affect day-to-day OpenCode usage.

Do not load skills. This file contains the complete workflow and child prompt template.

The job runs at 08:00 in the machine's local timezone. Treat 08:00 yesterday through 08:00 today as the daily delta window. Capture each local boundary with `date --date='<day> 08:00' --iso-8601=seconds`, then convert it to UTC with `date --utc --date="$timestamp" '+%Y-%m-%dT%H:%M:%SZ'`. Do not interpret 08:00 as UTC or depend on a previous session, report, checkpoint, or state file.

Create a disposable directory under `/tmp/opencode` and clone `https://github.com/anomalyco/opencode.git` with blob filtering. Use commits at or before the UTC boundaries to define the `origin/v2` comparison range. Git log and the boundary diff establish what actually reached the branch.

Use `gh` to collect metadata for every pull request merged into `v2` during the window and every currently open pull request based on `v2`. Gather titles, bodies, labels, merge and review state, changed-file lists, change size, branch or commit identifiers, and URLs. Short-list up to ten open pull requests by likely day-to-day impact, maturity, recency, and merge readiness. Read comments only when discussion materially changes a short-listed pull request's meaning, risk, dependency, or likelihood of merging.

Build a review packet inside the disposable directory for every merged pull request and every short-listed open pull request. Each packet must contain its metadata, changed-file list, and an actual patch. For merged work, prefer the diff that reached `v2`, using the merge commit against its first parent when available and a GitHub PR diff when merge strategy prevents reconstructing the full change. For open work, fetch the pull request head or use the GitHub PR diff. Keep the clone and packets until all child reviews finish.

Balance the packets by changed-line count across child batches. Use one child per packet when there are fewer than three packets; otherwise use three children for up to 15 packets, four for 16 to 40, and five for more than 40. Launch the children in parallel with `explore`. Do not load skills before delegation and do not compose new child instructions. Use this exact prompt template, replacing `<manifest>` with that batch's absolute manifest path:

> Do not load skills or launch subagents. Read every metadata, changed-file, and patch file listed in `<manifest>`. Determine what each pull request actually changes, with priority on day-to-day OpenCode behavior. Identify important interactions, overlap, regressions, migration concerns, and claims not supported by the patch. Return at most 500 words of evidence-backed findings grouped by impact, with pull request numbers and URLs. Do not return a complete file inventory or repeat metadata that does not affect the conclusion.

Wait for every child, then synthesize their findings with the branch-level Git evidence and GitHub state. Clean up the disposable directory before returning.

Do not modify the reference checkout, submit reviews, post comments, or mutate GitHub state. Writes are allowed only inside the task's disposable `/tmp/opencode` directory.

Return a human-facing Markdown digest of at most 900 words. Do not include an exhaustive pull request or commit table. Use this structure:

- `# OpenCode v2 daily delta`
- one compact line with the exact local and UTC boundaries plus merged-PR and branch-commit counts;
- `## What changed`: three to seven prioritized bullets describing behavior and why it matters, with pull request links inline;
- `## Likely next`: up to five open pull requests worth watching, each with one sentence about likely impact or material uncertainty;
- `## Watchouts`: only concrete conflicts, regressions, dependencies, migration concerns, or operational risks supported by the evidence; omit the section when empty.

Combine related pull requests into one point. Prefer observed branch behavior over pull request wording. Omit routine tests, formatting, dependency churn, and internal refactors unless they materially change usage or signal an important direction. If the window has no meaningful delta, say so briefly rather than filling the report.
