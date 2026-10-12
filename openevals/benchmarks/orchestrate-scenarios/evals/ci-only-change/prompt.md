Load the orchestrate skill.

Two changes to how we publish the agent's log rotation settings:

- I want to be able to start the publish workflow by hand from the Actions tab, picking which tag to publish, not only by pushing a tag.
- Each publish should also keep a copy under its version, `s3://agent-config/ssm/<version>/agent-logrotate.json`, next to `latest/`. And the script should refuse to publish anything, before uploading, when the version isn't a `v1.2.3`-style tag.

The publish only runs in GitHub Actions with our AWS role, so you can't run it for real here. Go ahead and make the change.

Don't run anything in the background. Running things in parallel is fine, but wait for them to finish.
