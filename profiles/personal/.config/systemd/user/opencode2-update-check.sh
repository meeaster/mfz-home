#!/bin/sh
# Update-on-start check for opencode2. Installs the pinned build when configured,
# otherwise a new beta build when one exists. Failures are non-fatal so the
# service starts with whatever binary is already on disk.
set -u

bin="$HOME/.opencode/bin/opencode2"
current=$("$bin" --version 2>/dev/null | cut -d ' ' -f2)
latest=${OPENCODE2_VERSION_PIN:-}
[ -n "$latest" ] || latest=$(curl -fsSL https://update.opencode.ai/api/beta/cli/npm 2>/dev/null | grep -o '"version":"[^"]*"' | head -n 1 | cut -d '"' -f4)

[ -n "$current" ] || exit 0
[ -n "$latest" ] || exit 0
[ "${current#v}" = "${latest#v}" ] && exit 0

echo "opencode2 update: $current -> $latest"
curl -fsSL https://opencode.ai/v2/install | bash -s -- --version "$latest" --no-modify-path
