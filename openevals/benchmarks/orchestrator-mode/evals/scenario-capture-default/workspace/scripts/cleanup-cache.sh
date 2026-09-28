#!/usr/bin/env bash
set -euo pipefail
find /srv/media/cache -type f -mtime +7 -delete
