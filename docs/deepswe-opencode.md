# DeepSWE OpenCode Runs

Run a DeepSWE task locally with OpenCode, the existing OpenCode OAuth
credential, GPT-5.6 Luna, and an optional Sol advisor. The commands below use
Docker through `datacurve-pier` and keep the task checkout isolated.

## Prerequisites

Clone DeepSWE and install Pier:

```bash
mkdir -p ~/code
git clone https://github.com/datacurve-ai/deep-swe.git ~/code/deep-swe
uv tool install datacurve-pier
```

Confirm the host OpenCode credential and model:

```bash
opencode --version
opencode auth list
opencode models openai --verbose
```

OpenCode `1.17.20` or newer is required. Each run must pin the container to
the same version reported by the local CLI; do not rely on Pier's cached
`@latest` agent layer.

OpenCode `1.17.20+` sends the required Codex-compatible identity headers
natively, so no separate identity plugin is needed.

The existing OAuth credential is stored at:

```text
~/.local/share/opencode/auth.json
```

Do not copy this file into the repository or bake it into an image. Mount it
read-only into the task container.

## Pier Mount Compatibility

Pier `0.3.0` replaces its default `/logs` mounts when `--mounts-json` is used.
The current OpenCode adapter writes live output through
`tee /logs/agent/opencode.txt`, but the DeepSWE image has no `/logs/agent`
directory by itself. Use the checked-in Python `sitecustomize.py` so non-log
custom mounts are appended to Pier's standard agent log mounts. The
`/logs/*` guard is important: separate verifier environments intentionally
receive their own log mounts, and preserving the agent's artifact mount there
can erase the host artifact directory during artifact handoff.

This workaround is not required solely for `model.patch` scoring. A sentinel
trial confirmed that Pier can collect the task-declared artifact without the
default mounts, but the current OpenCode run needs the agent log mount so its
output capture does not fail.

The source path in this home is:

```text
tools/deepswe/pier-sitecustomize/sitecustomize.py
```

Set the absolute path once before running Pier:

```bash
export PIER_SITECUSTOMIZE="$HOME/.mindframe-z/homes/personal/tools/deepswe/pier-sitecustomize"
```

## Common Variables

Run the version check before constructing any Pier command, then use that exact
version for every test run:

```bash
export OPENCODE_VERSION="$(opencode --version)"
printf 'Using OpenCode %s\n' "$OPENCODE_VERSION"
```

Choose one task directory. This example is intentionally bounded:

```bash
export DEEPSWE=~/code/deep-swe
export TASK="$DEEPSWE/tasks/anko-default-function-arguments"
export JOBS="$DEEPSWE/jobs"
```

Pinning the captured `OPENCODE_VERSION` keeps every comparison run on the same
OpenCode release and avoids stale Pier `@latest` layers. Always pass
`--agent-kwarg "version=$OPENCODE_VERSION"`.

## Cost Estimates

The session-cost TUI labels its values `API estimate`. It loads the current
catalog from `https://models.dev/api.json` and does not report ChatGPT/Codex
OAuth billing. Treat these figures as comparable planning estimates, not an
invoice or a charge shown by the OAuth account.

The relevant catalog rates for the models used here are USD per one million
tokens:

| Model | Prompt up to 272k tokens | Prompt over 272k tokens |
| --- | --- | --- |
| `openai/gpt-5.6-luna` | input `$1.00`; output/reasoning `$6.00`; cache read `$0.10`; cache write `$1.25` | input `$2.00`; output/reasoning `$9.00`; cache read `$0.20`; cache write `$2.50` |
| `openai/gpt-5.6-terra` | input `$2.50`; output/reasoning `$15.00`; cache read `$0.25`; cache write `$3.125` | input `$5.00`; output/reasoning `$22.50`; cache read `$0.50`; cache write `$6.25` |
| `openai/gpt-5.6-sol` | input `$5.00`; output/reasoning `$30.00`; cache read `$0.50`; cache write `$6.25` | input `$10.00`; output/reasoning `$45.00`; cache read `$1.00`; cache write `$12.50` |

The TUI chooses the higher tier when `input + cache read + cache write` is
greater than 272,000 tokens. It calculates each assistant message as:

```text
USD = (
  input * input_rate
  + (output + reasoning) * output_rate
  + cache_read * cache_read_rate
  + cache_write * cache_write_rate
) / 1,000,000
```

`gpt-5.6-luna` is the DeepSWE executor and `gpt-5.6-sol` is the advisor. The
`high` and `xhigh` variants used below have no separate catalog rate, so they
use the base or context-tier rates above; higher reasoning effort can still
increase the number of output/reasoning tokens and therefore the estimate.
Pricing can change as the live catalog changes.

## Advisor Enabled

This mounts the local advisor plugin:

- `advisor` provides the `advisor()` tool and uses `gpt-5.6-sol@high` as the
  stronger reviewer.

The extra URL-shaped provider options are allowlist hints for Pier. OAuth-backed
OpenAI requests use `chatgpt.com` and may refresh through `auth.openai.com`,
while the executor model itself is `openai/gpt-5.6-luna`.

```bash
PYTHONPATH="$PIER_SITECUSTOMIZE" \
pier run \
  --job-name deepswe-anko-advisor-on \
  --jobs-dir "$JOBS" \
  --n-concurrent 1 \
  --max-retries 0 \
  --yes \
  --path "$TASK" \
  --agent opencode \
  --model openai/gpt-5.6-luna \
  --agent-kwarg "version=$OPENCODE_VERSION" \
  --agent-kwarg variant=xhigh \
  --agent-kwarg 'opencode_config={"plugin":["file:///tmp/mindframe-advisor/server.ts"],"provider":{"openai":{"options":{"url":"https://chatgpt.com","api_url":"https://auth.openai.com"},"models":{"gpt-5.6-sol":{}}}}}' \
  --agent-env OPENCODE_ADVISOR_MODE=on \
  --agent-env OPENCODE_ADVISOR_MODELS=opencode:openai/gpt-5.6-sol@high \
  --mounts-json '[
    {"type":"bind","source":"/home/mark/.config/opencode/plugins/mindframe-z/advisor","target":"/tmp/mindframe-advisor","read_only":true},
    {"type":"bind","source":"/home/mark/.local/share/opencode/auth.json","target":"/root/.local/share/opencode/auth.json","read_only":true}
  ]'
```

`OPENCODE_ADVISOR_MODE=on` uses the active advisor policy. Set it to `auto` to
run the admission-policy comparison. Set it to `manual` to suppress automatic
advisor calls while keeping explicit `/consult-advisor` available. A successful
run may make zero or multiple advisor calls in `on` or `auto`; manual mode
should make none unless the executor explicitly requests a consultation. Check
the raw event stream rather than assuming that loading the plugin means it was
invoked.

For the comparison, change only this setting:

```text
--agent-env OPENCODE_ADVISOR_MODE=auto
```

For the manual comparison:

```text
--agent-env OPENCODE_ADVISOR_MODE=manual
```

## Advisor Disabled

Use the same task, model, effort, auth, OpenCode version, and network hints.
Omit only the advisor plugin and advisor environment variable:

```bash
PYTHONPATH="$PIER_SITECUSTOMIZE" \
pier run \
  --job-name deepswe-anko-advisor-off \
  --jobs-dir "$JOBS" \
  --n-concurrent 1 \
  --max-retries 0 \
  --yes \
  --path "$TASK" \
  --agent opencode \
  --model openai/gpt-5.6-luna \
  --agent-kwarg "version=$OPENCODE_VERSION" \
  --agent-kwarg variant=xhigh \
  --agent-kwarg 'opencode_config={"provider":{"openai":{"options":{"url":"https://chatgpt.com","api_url":"https://auth.openai.com"},"models":{"gpt-5.6-sol":{}}}}}' \
  --mounts-json '[
    {"type":"bind","source":"/home/mark/.local/share/opencode/auth.json","target":"/root/.local/share/opencode/auth.json","read_only":true}
  ]'
```

Run each advisor mode with a different job name and keep every other setting
identical. Parallel runs reduce wall-clock time but can increase provider rate
limiting and make latency comparisons less useful.

## Live Logs

Pier creates a random trial directory below the job directory. List it after
the run starts:

```bash
ls "$JOBS/deepswe-anko-advisor-on"/*/agent/opencode.txt
```

Follow the raw OpenCode JSON event stream:

```bash
tail -f "$JOBS/deepswe-anko-advisor-on/<trial>/agent/opencode.txt"
```

Show only useful text and tool events, omitting encrypted reasoning:

```bash
tail -f "$JOBS/deepswe-anko-advisor-on/<trial>/agent/opencode.txt" \
  | jq -r 'if .type == "tool_use" then (.part.tool + ": " + (.part.state.status // "")) elif .type == "text" then "TEXT: " + .part.text else empty end'
```

Confirm advisor calls and inspect their returned guidance:

```bash
grep -n '"tool":"advisor"' "$JOBS/deepswe-anko-advisor-on/<trial>/agent/opencode.txt"
```

`job.log` shows Pier's container commands and phase transitions:

```bash
tail -f "$JOBS/deepswe-anko-advisor-on/job.log"
```

## Results

Inspect the benchmark result and verifier reward:

```bash
jq . "$JOBS/deepswe-anko-advisor-on/result.json"
jq . "$JOBS/deepswe-anko-advisor-on/<trial>/verifier/reward.json"
```

The reward is only meaningful when the verifier sees the agent patch. The task's
`task.toml` already declares `/logs/artifacts/model.patch`; `--artifact` only
requests collection of an existing path and does not create the patch. If
`test-stdout.txt` says `no model.patch submitted`, inspect the handoff before
rerunning:

```bash
grep -n 'pre_artifacts\|model.patch' \
  "$JOBS/deepswe-anko-advisor-on/<trial>/trial.log"
ls -la "$JOBS/deepswe-anko-advisor-on/<trial>/artifacts"
if test -f "$JOBS/deepswe-anko-advisor-on/<trial>/artifacts/manifest.json"; then
  jq . "$JOBS/deepswe-anko-advisor-on/<trial>/artifacts/manifest.json"
fi
```

Compare at least reward, partial score, verifier failures, elapsed time, token
usage, and the number and content of advisor calls. A passing local test suite
inside OpenCode is not a benchmark score until Pier applies and verifies
`model.patch`.

## Artifact Handoff Failures

Pier runs `pre_artifacts.sh` after the agent and before the separate verifier.
For this task, that script creates `model.patch` from the agent's committed
work. A `pre_artifacts.sh failed to run` message means artifact capture did not
successfully complete; the later pristine-base score is then expected and is
not evidence that the verifier rejected the solution.

One completed run hit an observed WSL2/Docker Desktop transport failure during
Pier's `docker compose cp` upload, with a missing `/proc/self/fd/*` mount. That
failure was not reproducible in a small local Compose reproduction, so treat
it as an independent environment-transfer failure. Prefer a native Linux
Docker engine, a newer compatible Docker Desktop/Pier combination, or a
direct-`docker cp` transfer fallback before spending another model run.

The guarded mount workaround fixes a separate deterministic issue: applying
the agent's `/logs/artifacts` mount to the separate verifier aliases the host
artifact directory. Pier then empties `/logs/artifacts` while preparing the
verifier upload, deleting `model.patch` and the collection manifest before the
upload can occur. A future Pier release that merges custom and standard mounts
correctly would remove the need for this workaround.

## Cleanup

If a run is interrupted, check for containers left behind:

```bash
docker ps --format '{{.ID}} {{.Status}} {{.Names}}'
```

Remove only containers belonging to the interrupted DeepSWE job. The job logs
remain under `$JOBS` after container cleanup.
