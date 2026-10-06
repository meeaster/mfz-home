# Upgrading a machine's Cairn catalog

These steps bring an existing Cairn catalog up to date with the October 2026 changes. Run them once on each machine with a catalog, such as a work computer. They don't touch the transcripts or the OpenCode database; only the catalog changes, and it's backed up before each change.

## What the upgrade brings

- **Subagents.** A child session is recorded only for a real Agent tool subagent. Older catalogs also hold empty child sessions for Claude Code's internal work, sometimes hundreds under one session; `prune-phantom-subagents.mjs` removes them.
- **Titles.** Sessions show the title the harness gave them, or the first line of their first prompt, instead of "Untitled".
- **CLI runs.** Each root session is either interactive or a CLI run (`claude -p`, `opencode run`), and a CLI run links to the session whose shell started it. The sessions list hides CLI runs by default. Remote Control sessions count as interactive.
- **Cost.** Each session's model usage is priced at models.dev API rates, and the UI shows totals with subagents and CLI runs. Model names a gateway such as LiteLLM uses can be mapped to the models behind them.

The catalog's schema moves to version 7, from whichever version the machine has. Cairn applies the migrations itself the first time the new version opens the catalog.

## Before you start

- The machine's copy of the home repository (the one with `packages/cairn`) has the changes. In these steps `<home>` is that checkout.
- Node 26 or later, which Cairn already requires, and `opencode` on PATH if the machine uses OpenCode.
- If the catalog isn't at `~/workspace/artifacts/cairn`, export `CAIRN_ROOT` in the shell you run these steps from. If Claude Code's config isn't at `~/.claude`, export `CLAUDE_CONFIG_DIR` too. The scripts look in the same places the Cairn CLI does.

## Steps

### 1. Install the new Cairn

```sh
git -C <home> pull
cd <home> && mise run cairn:install
```

### 2. Back up and migrate the catalog

```sh
cairn backup
cairn check
sqlite3 -readonly "${CAIRN_ROOT:-$HOME/workspace/artifacts/cairn}/catalog.db" "PRAGMA user_version"
```

The first Cairn command after the install migrates the catalog; the last line should print `7`. `cairn check` may list missing or unrecorded files from before the upgrade; those aren't caused by it.

### 3. Reload the harnesses

The OpenCode plugin and the Claude Code hooks only pick up the new behavior in sessions that start after a reload.

```sh
opencode reload
```

Restart any Claude Code sessions you keep open. If the machine runs Claude Code Remote Control as a service, restart it; this ends every session running under it, so do it between tasks:

```sh
systemctl --user restart claude-remote-control.service
```

Also restart `cairn ui` if it's running; an old server can't read the new schema.

### 4. Map gateway model names

Skip this step if every model the machine uses has its own models.dev entry.

OpenCode records each call under the provider and model names in its config. Behind a LiteLLM gateway these are the gateway's names, which models.dev doesn't know, so their calls have no price. List the names OpenCode has recorded:

```sh
sqlite3 -readonly "$(opencode debug paths db)" \
  "SELECT json_extract(data, '$.model.providerID') || '/' || json_extract(data, '$.model.id') AS model, count(*) AS calls
   FROM session_message WHERE type = 'assistant' GROUP BY model ORDER BY calls DESC"
```

Then map each gateway name to the models.dev model whose price applies, in `pricing/aliases.json` under the Cairn root:

```json
{
  "gateway/opus": "anthropic/claude-opus-5-5",
  "gateway/gpt-6-sol": "openai/gpt-6-sol"
}
```

If the machine's profile already sets the `session-cost-tui` plugin's `modelAliases` option, copy that object into the file as it is; Cairn reads its `{ "providerID": ..., "modelID": ... }` targets too.

Keys are `<provider>/<model>` as OpenCode records it, and targets are the models.dev entry, as `<provider>/<model>` or in that object form, the way models.dev lists it (`https://models.dev/api.json`, keyed by provider, then model). Bedrock and Azure deployments usually bill at the model maker's list price, so `anthropic/...` and `openai/...` are reasonable targets; use `amazon-bedrock/...` or `azure/...` if their prices differ. A Claude Code session that goes through the gateway is recorded under the provider `anthropic` with the gateway's model name, so its key is `anthropic/<gateway model>`.

To see which model each gateway name stands for, the LiteLLM proxy's `/model/info` lists each name with its backing model in `litellm_params.model`, if your key is allowed to read it:

```sh
curl -s "$LITELLM_BASE_URL/model/info" -H "Authorization: Bearer $LITELLM_API_KEY" \
  | jq '.data[] | {name: .model_name, backing: .litellm_params.model}'
```

### 5. Remove phantom subagent sessions

```sh
cd <home>/packages/cairn/scripts/upgrade
node prune-phantom-subagents.mjs
node prune-phantom-subagents.mjs --apply
```

The first run only reports how many it would remove and under which sessions. `--apply` backs up the catalog, then removes them.

### 6. Re-index every session

```sh
node reindex-all.mjs
```

This fills in titles, the CLI-run marker, and usage and cost for every root session and its subagents. It takes a few minutes for a few hundred sessions. Sessions whose transcript or OpenCode record no longer exists are listed as failed; that's expected.

### 7. Link earlier CLI runs to their sessions

```sh
node link-spawners.mjs
node link-spawners.mjs --apply
```

New CLI runs record the session that started them. For runs from before the upgrade, this script infers it from the shell commands each session ran: a run that started while exactly one session had a command running is linked to that session. Runs inside more than one session's command, or none, stay unlinked. Check the dry run's list of sessions before applying. Links it adds look the same as recorded ones in the catalog.

### 8. Check the result

```sh
CATALOG="${CAIRN_ROOT:-$HOME/workspace/artifacts/cairn}/catalog.db"

# Root sessions by harness and origin.
sqlite3 -readonly "$CATALOG" "SELECT harness, coalesce(origin, 'unknown'), count(*) FROM session WHERE parent_session_id IS NULL GROUP BY 1, 2"

# Cost by model, and calls no model price covered.
sqlite3 -readonly "$CATALOG" "SELECT provider || '/' || model, sum(calls), round(total(cost_usd), 2), sum(unpriced_calls) FROM session_usage GROUP BY 1 ORDER BY 3 DESC"
```

Any model with unpriced calls needs an entry in `pricing/aliases.json`. Add it and run `node reindex-all.mjs` again; re-indexing replaces each session's usage, so running it twice is safe.

Then open the UI (`cairn ui`) and check the sessions list: it should show interactive sessions by default, with a Cost column.

## If something goes wrong

Every `--apply` run and step 2 make a backup under `backups/` in the Cairn root. To go back to one:

```sh
cairn restore <backup-file>
```

A catalog restored from before step 2 has the old schema, which the new Cairn migrates again on its next run.
