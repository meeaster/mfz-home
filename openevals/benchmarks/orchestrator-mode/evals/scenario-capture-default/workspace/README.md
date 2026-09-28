# homelab-ops

Scheduled maintenance for the home server. `install.sh` copies the units in `systemd/` into the user systemd directory and enables every timer.

Jobs:

- Backups: `systemd/backup.timer` runs `scripts/backup.sh`.
- Cache cleanup: `scripts/cleanup-cache.sh`.
- Log rotation: `scripts/rotate-logs.sh`.
