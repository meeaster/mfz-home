# codex-imagegen

## Intent

Give agents without a native image tool a reliable way to generate or edit raster images through Codex's account-backed built-in image generation, without an OpenAI API key and without exposing the project or the personal Codex environment to a second exploring agent. The calling agent owns context, design intent, image selection, review, and iteration; Codex only executes one bounded brief.

Not for: deterministic diagrams, vector assets, or pixel-exact rendering.

Success: one validated PNG at the requested path, model and effort reported, unrelated composition preserved in edits, and visual acceptance done by the calling agent.

## Scenarios

- **Image for an HTML page** whose source and styles the caller can read: the caller inspects the page and writes a self-contained brief; Codex sees only the brief and selected images.
- **Generation from a brief** with no input images: exactly one built-in image call, no API key, PNG copied unchanged to `--out`.
- **Bounded edit of an existing PNG**: the image is labeled as the sole edit target, invariants repeated, source unchanged, result saved under a new versioned name.
- **Multiple image roles** (edit target, style reference, compositing source): brief and `--image` order match; at most five images.
- **Preview on a Linux desktop**: opens the full-resolution original, no derivative.
- **Two sequential runs** share the worker home: login reused, no conversation carried over, runs serialized.
- **Parallel variants**: a distinct `--worker-home` per process, cleaned up after outputs are copied.
- **Built-in tool or login fails**: nonzero exit with a diagnostic; never asks for an API key or switches service or model.

## Decisions

- **The calling agent gathers context; Codex gets one brief through stdin.** A second agent exploring the project costs tokens and makes its own design choices.
- **Isolation is enforced, not requested in the prompt.** The first version found that Codex's legacy read-only sandbox still allowed host reads and that Codex 0.146.1 couldn't disable `view_image`. Disabled tools plus a split-filesystem read profile replaced prompt-only restraint; keep enforced read boundaries when Codex's permission mechanisms change.
- **A reusable worker home with login seeded from the ordinary Codex home**, so the human's existing login works without an API key. Auth is copied only when missing; refreshed worker credentials never go back to the ordinary home. Runs that share a home are serialized.
- **Always pass `--` before the prompt.** Codex's `--image` swallowed the positional prompt without it.
- **No fallback to the Image API or another service.** The point is account-backed generation without a key; a silent switch would change cost and behavior.
- **Sol is the default** (human, 2026-08-06). In a three-images-per-model comparison on GPT-5.6, the human preferred Sol's expressiveness; Luna was the most consistent and Terra the most balanced. Variation within one model was about as large as between models, and every built-in call rendered with `gpt-image-2`. Not re-evaluated on GPT-6. Re-run a matched comparison before changing the default.
- **Portable.** Works without Mindframe-Z or this workspace; the worker home location comes from `CODEX_IMAGEGEN_HOME` or a platform default.

## Sources

| Source | Revision | Local use |
|---|---|---|
| Codex CLI and its built-in image tool | `0.146.1` on Linux under WSL2; image model `gpt-image-2` from Codex source | Flags (`--ignore-user-config`, `--ignore-rules`, `--ephemeral`, permission profiles, feature toggles, `--image`), the reference-image limit, and output paths are version-sensitive; recheck them against CLI help and source before changing the runner. macOS and Windows paths are implemented but untested |
