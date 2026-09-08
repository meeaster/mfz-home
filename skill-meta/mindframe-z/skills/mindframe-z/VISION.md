# Vision

Make Mindframe-Z guidance reachable before configuration changes, from any working directory. Model invocation should cover requests naming MFZ and ordinary requests for recurring OpenCode jobs. Keep the skill short and route detailed home, skill, and scheduling mechanics to the CLI guides.

Home source remains authoritative over rendered configuration. Recurring OpenCode jobs use the cron guide as their operational source of truth. Systemd user timers fit the existing machine lifecycle and provide status, journal output, missed-run catch-up, and same-service non-overlap without a new scheduler abstraction.

Session policy is a per-job decision. Small independent jobs should not inherit the cost and complexity of a persistent-root worker pattern. Generic systemd diagnosis, literal crontab management, and a new scheduler or compact-before-run framework are outside this skill's intended role.
