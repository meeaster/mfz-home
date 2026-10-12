# agent-config

The log rotation settings our VPN hosts' agents load, published to S3 by GitHub Actions.

Pushing a `v*` tag runs `.github/workflows/publish.yml`, which assumes the publish role and runs `scripts/publish.sh` with the tag. The hosts read `s3://agent-config/ssm/latest/agent-logrotate.json`.
