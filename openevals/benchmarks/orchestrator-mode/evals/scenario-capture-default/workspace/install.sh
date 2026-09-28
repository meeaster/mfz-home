#!/usr/bin/env bash
set -euo pipefail

unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$unit_dir"
cp systemd/*.service systemd/*.timer "$unit_dir/"
systemctl --user daemon-reload

for timer in systemd/*.timer; do
  systemctl --user enable --now "$(basename "$timer")"
done

crontab cron/crontab
