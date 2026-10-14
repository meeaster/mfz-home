#!/usr/bin/env bash
# Open a new Windows Terminal window running a WSL command, with a fixed title that
# `record-window.sh start WindowsTerminal <out> --title <title>` can find.
#
#   terminal-window.sh <title> [--fullscreen | --maximized | --size COLS,ROWS] [--cwd DIR] -- <command...>
#
# The command runs with this shell's PATH and working directory, because the shell wsl.exe starts doesn't load
# the caller's setup. When it exits, its exit code is written to <state>/<title>.exit and the window closes.
set -euo pipefail

title=${1:-}; shift || true
[[ -n $title ]] || { sed -n '2,8p' "$0"; exit 2; }
layout=() cwd=$PWD
while (($#)); do
  case $1 in
    --fullscreen) layout=(--fullscreen); shift ;;
    --maximized) layout=(--maximized); shift ;;
    --size) layout=(--size "$2"); shift 2 ;;
    --cwd) cwd=$(realpath "$2"); shift 2 ;;
    --) shift; break ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
(($#)) || { echo "missing command after --" >&2; exit 2; }

win() { (cd /mnt/c && "$@"); }   # run Windows binaries from a Windows-visible cwd
powershell=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe
wt=${WT_EXE:-$(command -v wt.exe || true)}
if [[ -z $wt ]]; then
  # shellcheck disable=SC2016 # $env:LOCALAPPDATA is expanded by PowerShell
  wt="$(wslpath -u "$(win "$powershell" -NoProfile -Command '$env:LOCALAPPDATA' | tr -d '\r')")/Microsoft/WindowsApps/wt.exe"
fi
[[ -x $wt ]] || { echo "wt.exe not found; set WT_EXE to its WSL path" >&2; exit 1; }

# WSL_DISTRO_NAME isn't always set in agent shells; the UNC path of / names the distro.
distro=$(wslpath -w / | sed 's|\\|/|g' | cut -d/ -f4)

state=${XDG_STATE_HOME:-$HOME/.local/state}/windows-app-recording/terminal
mkdir -p "$state"
slug=${title//[^A-Za-z0-9._-]/_}
launcher=$state/$slug.sh
rm -f "$state/$slug.exit"
{
  echo '#!/usr/bin/env bash'
  printf 'export PATH=%q\n' "$PATH"
  printf 'cd %q || exit\n' "$cwd"
  printf '%q ' "$@"; echo
  # Exit 0 so Windows Terminal closes the tab instead of keeping a "process exited" pane open.
  printf 'echo $? > %q\n' "$state/$slug.exit"
  echo 'exit 0'
} > "$launcher"
chmod +x "$launcher"

# wt.exe splits its whole command line on `;` into extra tabs: the command lives in the launcher file, and the
# title escapes it.
win "$wt" -w new "${layout[@]}" --title "${title//;/\\;}" --suppressApplicationTitle wsl.exe -d "$distro" -- "$launcher"
echo "opened '$title'; exit code will be written to $state/$slug.exit"
