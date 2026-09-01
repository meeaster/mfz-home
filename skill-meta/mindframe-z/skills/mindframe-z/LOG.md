# Decision Log

## 2026-08-25: Route recurring OpenCode jobs through `mfz guide cron`

The skill description now treats recurring OpenCode jobs as an invocation branch, including plain "cron job" requests that do not name `mfz`. The skill body and managed home block carry only a short pointer. Detailed scheduling guidance remains in the CLI topic guide to avoid permanent context cost and duplicated instructions.

The guide records four session policies but does not force one policy onto every job. Systemd user service/timer pairs remain the machine default because they already fit MFZ rendering and provide status, journal output, missed-run catch-up, and same-service non-overlap without a new scheduler abstraction.
