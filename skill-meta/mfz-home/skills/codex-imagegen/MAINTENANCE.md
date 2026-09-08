# Maintenance

Read when updating the Codex runner, isolation policy, or model-selection guidance. The baseline below is inherited evidence, not reverified by the metadata migration.

## Tested baseline

- Codex CLI: 0.146.1
- Platform: Linux under WSL2
- Reasoning models: `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`
- Effort: `high`
- Built-in image model in inspected Codex source: `gpt-image-2`
- Output observed: 1254 by 1254 RGB PNG for square requests

Codex CLI flags, feature names, model availability, output paths, system-skill behavior, and image-model routing are version-sensitive. Treat the baseline as evidence, not a compatibility promise. macOS and Windows paths are implemented but not live-validated; Codex must enforce the split-filesystem profile or fail closed rather than falling back to broad reads.

## Worker state

The runner seeds `auth.json` only when absent. Codex may refresh the worker copy. Never copy refreshed worker credentials back to the ordinary Codex home automatically. Never commit or print auth content.

## Refresh checks

1. Inspect the current Codex CLI help and model catalog.
2. Verify `--ignore-user-config`, `--ignore-rules`, `--ephemeral`, named permission profiles, feature toggles, `--image`, `--`, and final-message behavior.
3. Inspect current Codex source for the built-in image tool schema, reference-image limit, output location, and image model.
4. Run the generation, editing, reusable-state, original-preview, and no-fallback evaluations.
5. Re-run a matched multi-sample model comparison only when model selection guidance or defaults may change.
6. Update affected runtime guidance, scenarios, and baseline. Preserve a changed model preference with its comparison evidence; routine updates need no log entry.

## Non-obvious compatibility constraints

Codex's `--image` option consumed a positional prompt without a separating `--` in the original investigation. Retain the separator when revising argument construction.

The initial isolation work found that legacy read-only sandboxing still allowed host reads and Codex 0.146.1 could not disable `view_image`. Disabled exploratory tools and a split-filesystem profile replaced prompt-only restraint. Preserve enforced read boundaries when adopting new permission mechanisms.

Reusable isolated state was chosen to reuse login safely while serializing writes and bounding retained diagnostics. Atomic auth seeding runs under the worker lock, managed directories reject symlinks, final publication is atomic, and raw child diagnostics are not printed on failure.

## Isolation verification

Verify that the child environment remains an allowlist, credentials stay mode `0600` where supported, state directories stay private and reject symlinks, input images and final output remain outside the worker home, shell/browser/computer/web-search/code-mode/subagent tools remain disabled, local image reads remain confined to staged inputs and minimal system paths, output publication remains atomic, and failure diagnostics do not print child output.
