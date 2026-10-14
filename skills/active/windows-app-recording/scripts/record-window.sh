#!/usr/bin/env bash
# Record a Windows app's window from WSL with Windows ffmpeg's Desktop Duplication grabber (ddagrab).
#
#   record-window.sh start <ProcessName> <out.mp4> [--title T] [--fps 60] [--no-mouse] [--region X Y W H | --screen]
#   record-window.sh stop  <ProcessName>
#   record-window.sh status <ProcessName>
#
# Needs WINDOWS_FFMPEG: WSL path to a 64-bit Windows ffmpeg.exe that lists ddagrab in `-filters`.
# start brings the window to the front (--title picks the one with that exact title) and records it whole,
# trimmed to the monitor's work area (primary monitor only); --region records only that part, in pixels of a
# whole-window take. --screen records the whole monitor; the window is still raised when possible, but a refusal
# only warns, and <ProcessName> may then be any label (e.g. `screen`) when no single app owns the take.
# stop sends ffmpeg `q` so the file is finalized, moves it to <out.mp4>, and writes <out.mp4>.json.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
cmd=${1:-}; name=${2:-}
[[ -n $cmd && -n $name ]] || { sed -n '2,13p' "$0"; exit 2; }
state=${XDG_STATE_HOME:-$HOME/.local/state}/windows-app-recording/$name
win() { (cd /mnt/c && "$@"); }   # run Windows binaries from a Windows-visible cwd
powershell=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe
now_ms() { date +%s%3N; }

start() {
  local out=$1; shift
  local fps=60 mouse=1 screen=0 region=() title=()
  while (($#)); do
    case $1 in
      --fps) fps=$2; shift 2 ;;
      --title) title=(-Title "$2"); shift 2 ;;
      --no-mouse) mouse=0; shift ;;
      --screen) screen=1; shift ;;
      --region) region=("$2" "$3" "$4" "$5"); shift 5 ;;
      *) echo "unknown option $1" >&2; exit 2 ;;
    esac
  done
  [[ -x ${WINDOWS_FFMPEG:-} ]] || { echo "set WINDOWS_FFMPEG to a Windows ffmpeg.exe (WSL path)" >&2; exit 2; }
  [[ -e $state/ffmpeg.pid ]] && kill -0 "$(cat "$state/ffmpeg.pid")" 2>/dev/null && { echo "already recording $name" >&2; exit 1; }
  mkdir -p "$state"; rm -f "$state"/{ctl,*.pid}

  local rect x=0 y=0 w=0 h=0 cx=0 cy=0
  if rect=$(win "$powershell" -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$here/window-rect.ps1")" -Name "$name" "${title[@]}" 2> "$state/rect.err" | tr -d '\r') && [[ -n $rect ]]; then
    read -r x y w h cx cy <<< "$rect"
  elif ((screen == 1)); then
    # A whole-monitor take doesn't depend on which window has focus (an invisible Notification Center window can
    # hold it); the layout the user arranged is recorded as is.
    echo "note: $name not raised; recording the monitor as it is" >&2
  else
    tr -d '\r' < "$state/rect.err" | grep -m1 . >&2 || true
    echo "$name is not in front; ask the user to bring it forward, then start again" >&2; exit 1
  fi
  if ((${#region[@]})); then
    x=$((x + region[0])); y=$((y + region[1])); w=${region[2]}; h=${region[3]}
  fi
  w=$((w / 2 * 2)); h=$((h / 2 * 2))   # x264 needs even dimensions

  local filter="ddagrab=framerate=$fps:draw_mouse=$mouse,hwdownload,format=bgra"
  ((screen == 1)) || filter+=",crop=$w:$h:$x:$y"
  ((screen == 1)) && { x=0; y=0; w=0; h=0; }
  # Convert with the BT.709 matrix and tag the stream to match; ddagrab's frames otherwise carry an sRGB transfer
  # tag and the default conversion uses BT.601, so players guess and shift colours.
  filter+=",scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"

  local tmp_win tmp
  # shellcheck disable=SC2016 # $env:TEMP is expanded by PowerShell
  tmp_win="$(win "$powershell" -NoProfile -Command '$env:TEMP' | tr -d '\r')\\war-$name-$$.mp4"
  tmp=$(wslpath -u "$tmp_win")
  printf '%s\n%s\n' "$tmp" "$(realpath -m "$out")" > "$state/paths"
  printf '{"app":"%s","fps":%s,"capture":{"x":%s,"y":%s,"width":%s,"height":%s},"client":{"x":%s,"y":%s}' \
    "$name" "$fps" "$x" "$y" "$w" "$h" "$cx" "$cy" > "$state/meta"

  mkfifo "$state/ctl"
  # Hold the pipe open so ffmpeg never sees EOF on stdin; `q` written by stop ends the recording cleanly.
  # Both background jobs detach from this script's stdout and stderr, so a caller capturing them isn't left
  # waiting for the recording to end.
  setsid sleep infinity > "$state/ctl" 2> /dev/null < /dev/null & echo $! > "$state/holder.pid"
  (cd /mnt/c && exec setsid "$WINDOWS_FFMPEG" -hide_banner -loglevel error -y -filter_complex "$filter" \
    -c:v libx264 -preset veryfast -crf 18 -movflags +faststart "$tmp_win") < "$state/ctl" > "$state/ffmpeg.log" 2>&1 &
  echo $! > "$state/ffmpeg.pid"
  sleep 1.5
  kill -0 "$(cat "$state/ffmpeg.pid")" 2>/dev/null || { cat "$state/ffmpeg.log" >&2; exit 1; }
  if ((screen == 1)); then echo "recording $name (whole monitor, ${fps} fps) -> $out"; else echo "recording $name ($w x $h at $x,$y, ${fps} fps) -> $out"; fi
}

stop() {
  [[ -e $state/ffmpeg.pid ]] || { echo "not recording $name" >&2; exit 1; }
  local pid stopped; pid=$(cat "$state/ffmpeg.pid")
  printf q > "$state/ctl"
  stopped=$(now_ms)
  for _ in $(seq 1 100); do kill -0 "$pid" 2>/dev/null || break; sleep 0.2; done
  kill "$(cat "$state/holder.pid")" 2>/dev/null || true
  local tmp out; { read -r tmp; read -r out; } < "$state/paths"
  rm -f "$state"/{ctl,*.pid}
  [[ -s $tmp ]] || { echo "no output; ffmpeg log:" >&2; cat "$state/ffmpeg.log" >&2; exit 1; }
  mkdir -p "$(dirname "$out")"; mv "$tmp" "$out"

  local duration size
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
  size=$(ffprobe -v error -show_entries stream=width,height -of csv=p=0:s=x "$out")
  # ffmpeg stops within a frame of `q`, so the first frame was captured `duration` before that moment.
  printf '%s,"video":{"width":%s,"height":%s,"duration":%s},"startedAtMs":%s,"stoppedAtMs":%s}\n' \
    "$(cat "$state/meta")" "${size%x*}" "${size#*x}" "$duration" \
    "$(awk -v s="$stopped" -v d="$duration" 'BEGIN { printf "%d", s - d * 1000 }')" "$stopped" > "$out.json"
  echo "saved $out (${duration} s, ${size}) and $out.json"
}

status() {
  if [[ -e $state/ffmpeg.pid ]] && kill -0 "$(cat "$state/ffmpeg.pid")" 2>/dev/null; then echo "recording $name"; else echo "idle"; fi
}

case $cmd in
  start) shift 2; start "$@" ;;
  stop) stop ;;
  status) status ;;
  *) sed -n '2,13p' "$0"; exit 2 ;;
esac
