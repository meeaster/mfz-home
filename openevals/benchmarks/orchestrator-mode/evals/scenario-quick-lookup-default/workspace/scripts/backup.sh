#!/usr/bin/env bash
set -euo pipefail
rsync -a --delete /srv/media/library/ /mnt/backup/library/
