# Vision

## Problem

Mindframe-Z configuration can be changed from any directory, and recurring OpenCode jobs span home source, rendered prompts, OpenCode agents, systemd user units, and session policy. An agent must reach the owning guidance before it edits any of those surfaces.

## Intended Behavior

The model-invoked `mindframe-z` skill routes requests that name `mfz` or Mindframe-Z, including ordinary requests to create recurring OpenCode jobs. It keeps always-loaded instructions short and sends the agent to `mfz guide`, `mfz guide skills`, or `mfz guide cron` for the detailed branch.

For recurring jobs, `mfz guide cron` is the single source of operational guidance. It preserves systemd user timers as the simple default while making session policy an explicit per-job choice.

## Success

A future request such as "create a cron job that runs OpenCode every morning" reaches the Mindframe-Z guidance, selects an appropriate direct or delegated session policy, edits home source rather than rendered output, and verifies the timer and OpenCode runtime without inventing a scheduler framework.

## Non-Goals

- Copying the complete scheduled-job guide into the skill body.
- Adding literal crontab management, a generic scheduler schema, or a compact-before-run framework.
- Requiring the persistent-root worker pattern for small independent jobs.
