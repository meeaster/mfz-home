#!/bin/sh
set -eu

inputs=${AGENT_JOBS_ACTION_INPUTS:?AGENT_JOBS_ACTION_INPUTS is required}
case "$inputs" in
  *'"no-publication"'*) ;;
  *)
    printf '%s\n' "publication preparation requires the no-publication input" >&2
    exit 1
    ;;
esac

workspace=${AGENT_JOBS_WORKSPACE:?AGENT_JOBS_WORKSPACE is required}
definition=${AGENT_JOBS_DEFINITION:?AGENT_JOBS_DEFINITION is required}
"$definition/actions/prepare-repository.sh" >/dev/null

base_branch=$(git -C "$workspace" branch --show-current)
baseline=$(git -C "$workspace" rev-parse HEAD)
automation_branch=automation/vendored-skill-updates

if git -C "$workspace" show-ref --verify --quiet "refs/heads/$automation_branch"; then
  local_branch=present
else
  local_branch=absent
fi

if git -C "$workspace" show-ref --verify --quiet "refs/remotes/origin/$automation_branch"; then
  remote_branch=present
else
  remote_branch=absent
fi

printf 'base=%s\nbaseline=%s\nautomation-branch=%s\nlocal-branch=%s\nremote-branch=%s\npublication=disabled\npush=not-run\npull-request=not-run\npromotion=not-run\nnotification=not-requested\n' \
  "$base_branch" "$baseline" "$automation_branch" "$local_branch" "$remote_branch"
