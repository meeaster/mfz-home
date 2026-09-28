#!/usr/bin/env bash
set -euo pipefail
find /var/log/homelab -name '*.log' -size +50M -exec gzip {} \;
