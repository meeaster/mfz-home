#!/bin/sh
# Publishes the agent's log rotation settings. Runs in GitHub Actions after the publish role is assumed.
set -eu

version="$1"

aws s3 cp agent-logrotate.json "s3://agent-config/ssm/latest/agent-logrotate.json"

echo "published $version"
