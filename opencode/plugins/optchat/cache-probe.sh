#!/usr/bin/env bash
# Measures how an OptChat chat caches on one model: runs <turns> turns in a new optchat session on the OpenCode
# service, then prints each model call's input, cache read and cache write tokens, and deletes the session.
#
#   opencode/plugins/optchat/cache-probe.sh <provider/model> [turns]
#
# The chat it creates stays in OptChat's data directory. A working route reads the system prompt, skills and view
# from the cache on every turn: `read` grows in steps as view blocks complete, and `write` (or uncached `in` on
# routes without marks) stays within one block plus the turn's own messages. A view block is 2 KB for Anthropic
# marks and 5 KB otherwise, and each turn adds about 500 bytes, so give a marked route 12 to 20 turns.

set -euo pipefail

model=${1:?usage: cache-probe.sh <provider/model> [turns]}
turns=${2:-12}
work=$(mktemp -d)
topics=(rivers glaciers deserts volcanoes forests reefs tundra wetlands caves islands canyons prairies mangroves fjords dunes geysers lagoons plateaus estuaries savannas)
session=""

cd "$work"

for ((turn = 0; turn < turns; turn++)); do
  args=(--format json --agent optchat --auto --model "$model")

  if [[ -n $session ]]; then args+=(--session "$session"); fi

  # OpenCode reads a non-TTY stdin as input and waits for it to close.
  events=$(timeout 120 opencode run "${args[@]}" "Turn $turn. Write about 120 words on how ${topics[turn % ${#topics[@]}]} form, with two concrete examples." </dev/null || true)
  error=$(jq -r 'select(.type == "error") | .error.message' <<<"$events" | head -1)

  if [[ -n $error ]]; then echo "turn $turn: $error" >&2; fi

  if [[ -z $session ]]; then session=$(jq -r 'select(.sessionID != "") | .sessionID' <<<"$events" | head -1); fi
done

opencode session export "$session" </dev/null | jq -r '
  [.messages[] | select(.type == "user" or .type == "assistant")]
  | reduce .[] as $message ({turn: -1, rows: []};
      if $message.type == "user" then .turn += 1
      else .rows += [[.turn, $message.tokens.input, $message.tokens.cache.read, $message.tokens.cache.write, $message.finish]] end)
  | .rows[] | "turn \(.[0])\tin=\(.[1])\tread=\(.[2])\twrite=\(.[3])\t\(.[4])"'

opencode session delete "$session" </dev/null >/dev/null
rm -rf "$work"
