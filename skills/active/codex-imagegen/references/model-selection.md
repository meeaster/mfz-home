# Codex Model Selection

The Codex reasoning model interprets the brief and constructs the built-in tool call. It does not render the pixels. Codex 0.146.1 currently routes built-in generation and editing to `gpt-image-2`, so image randomness can outweigh reasoning-model differences.

## Default: GPT-5.6 Sol

Use `gpt-5.6-sol` at `high` unless the user chooses otherwise. In the August 2026 comparison, Sol produced the most expressive and visually distinctive compositions, which is the preferred default for this skill. It also showed the widest variation: one of three images missed an exact five-layer count, one leaned toward a figurative worker shape, and one run first sent an invalid empty image-reference argument before recovering automatically.

Choose Sol when visual character and interpretation matter more than minimizing variation. Keep the brief explicit and visually verify counts and invariants.

## GPT-5.6 Terra

Terra tended toward clean, legible system compositions and balanced interpretation. Two of three fresh runs called the image tool directly without reading the long system skill, while one of three images appeared to miss an exact layer count.

Choose `gpt-5.6-terra` when the brief leaves meaningful composition or design judgment to the worker, or when restrained clarity is more important than expressive variation.

## GPT-5.6 Luna

Luna was the most consistent in the observed comparison about five-path convergence and five-layer packets, with no tool-call failures. Its outputs were direct and structurally faithful, though one right-side assembly could be read as more character-like than requested.

Choose `gpt-5.6-luna` for a tightly bounded relay where the calling agent has already resolved the design and constraint fidelity matters more than additional interpretation.

## Evidence Boundary

The comparison used:

- Codex CLI 0.146.1;
- one identical detailed brief;
- `high` reasoning for every model;
- three generated images per model;
- isolated worker homes with user config, MCPs, apps, and plugins disabled;
- one successful built-in `image_gen` result per run;
- the same `gpt-image-2` renderer.

The broad composition and palette stayed similar across all nine images. Variation within each model family was roughly as large as variation between families. Treat the tendencies above as selection guidance from a small observed sample, not stable personality guarantees. Re-evaluate after Codex, model, or image-renderer changes.

## Reasoning Effort

The observed comparison used `high`; lower efforts were not evaluated. Keep `high` as the default while cost is not a concern. If latency becomes important, compare `medium` and `high` using the same brief and at least three samples per effort before changing the default.
