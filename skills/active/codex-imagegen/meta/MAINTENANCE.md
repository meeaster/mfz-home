# Maintenance

## Runtime Dependencies

- Python 3 with only the standard library.
- A `codex` executable on `PATH`.
- A Codex account login available as a file-backed `auth.json`, or a one-time login performed inside the isolated worker home.
- Codex's hosted image-generation tool and stable `image_generation` feature.
- `xdg-open` on Linux, `open` on macOS, or the Windows shell only when desktop preview is requested.

No OpenAI SDK or `OPENAI_API_KEY` is used.

## Tested Baseline

- Codex CLI: 0.146.1
- Platform: Linux under WSL2
- Reasoning models: `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`
- Effort: `high`
- Built-in image model in inspected Codex source: `gpt-image-2`
- Output observed: 1254 by 1254 RGB PNG for square requests

Codex CLI flags, feature names, model availability, output paths, system-skill behavior, and image-model routing are version-sensitive. Treat the baseline as evidence, not a compatibility promise. macOS and Windows paths are implemented but not live-validated; Codex must enforce the split-filesystem profile or fail closed rather than falling back to broad reads.

## Worker State

`CODEX_IMAGEGEN_HOME` overrides the worker root. Defaults are the user's platform state or application-support directory under `codex-imagegen`. The root contains a private home, Codex state, one lock, bounded last-run diagnostics, temporary run directories, and the latest built-in generated image.

The runner seeds `auth.json` only when absent. Codex may refresh the worker copy. Never copy refreshed worker credentials back to the ordinary Codex home automatically. Never commit or print auth content.

## Update Procedure

1. Inspect the current Codex CLI help and model catalog.
2. Verify `--ignore-user-config`, `--ignore-rules`, `--ephemeral`, named permission profiles, feature toggles, `--image`, `--`, and final-message behavior.
3. Inspect current Codex source for the built-in image tool schema, reference-image limit, output location, and image model.
4. Run the generation, editing, reusable-state, original-preview, and no-fallback evaluations.
5. Re-run a matched multi-sample model comparison only when model selection guidance or defaults may change.
6. Update `SKILL.md`, references, evaluations, baseline, and decision log together when behavior changes.

## Security Review

Verify that the child environment remains an allowlist, credentials stay mode `0600` where supported, state directories stay private and reject symlinks, input images and final output remain outside the worker home, shell/browser/computer/web-search/code-mode/subagent tools remain disabled, local image reads remain confined to staged inputs and minimal system paths, output publication remains atomic, and failure diagnostics do not print child output.
