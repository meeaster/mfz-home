#!/bin/sh
set -eu

workspace=${AGENT_JOBS_WORKSPACE:?AGENT_JOBS_WORKSPACE is required}
definition=${AGENT_JOBS_DEFINITION:?AGENT_JOBS_DEFINITION is required}

top_level=$(git -C "$workspace" rev-parse --show-toplevel)
if [ "$top_level" != "$workspace" ]; then
  printf '%s\n' "workspace root is not the runtime workspace: $top_level" >&2
  exit 1
fi

expected_origin=$(sed -n 's/^  repository: *//p' "$definition/job.yaml" | head -n 1)
actual_origin=$(git -C "$workspace" remote get-url origin)
if [ "${actual_origin%.git}" != "${expected_origin%.git}" ]; then
  printf '%s\n' "workspace origin does not match the installed package" >&2
  exit 1
fi

branch=$(git -C "$workspace" branch --show-current)
if [ "$branch" != "main" ]; then
  printf '%s\n' "workspace branch is not main: ${branch:-detached}" >&2
  exit 1
fi

status=$(git -C "$workspace" status --porcelain=v1)
if [ -n "$status" ]; then
  printf '%s\n' "workspace is not clean" >&2
  exit 1
fi

git_directory=$(git -C "$workspace" rev-parse --git-dir)
for marker in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD BISECT_LOG rebase-apply rebase-merge sequencer; do
  if [ -e "$git_directory/$marker" ]; then
    printf '%s\n' "workspace has unfinished Git operation: $marker" >&2
    exit 1
  fi
done

baseline=$(git -C "$workspace" rev-parse HEAD)
printf 'origin=%s\nbranch=%s\nbaseline=%s\n' "$actual_origin" "$branch" "$baseline"
