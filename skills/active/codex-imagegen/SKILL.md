---
name: codex-imagegen
description: Generate or edit raster images through an isolated Codex CLI worker using its built-in image_gen tool. Use when the current agent should create a contextual bitmap asset, generate variants, or edit an attached image without an OpenAI API key, especially when the calling agent must gather project or page context before delegating only the bounded image task to Codex.
---

# Codex Imagegen

Use the calling agent for context, judgment, and review. Use Codex only as a bounded image worker.

## Workflow

1. Gather the context before invoking Codex.

   Inspect the relevant page, copy, styles, assets, and user constraints. Render or inspect a page screenshot when visual matching depends on the rendered result. Select only the information and images needed for this asset. Done when Codex will not need to explore the project or decide what context matters.

2. Write one authoritative brief.

   Use [references/brief-template.md](references/brief-template.md). Specify purpose, placement, composition, palette, relationships, exact text, invariants, and exclusions. For every input image, label its ordered role as `edit target`, `style reference`, or `compositing source`. Keep deterministic diagrams and existing vector systems in SVG, HTML/CSS, or their native format instead of image generation. Done when the brief can be sent without the source conversation.

3. Select the Codex model.

   Default to `gpt-5.6-sol` at `high` reasoning. Read [references/model-selection.md](references/model-selection.md) when choosing another model, comparing variants, or interpreting quality differences. The Codex model translates the brief into a tool call; built-in `image_gen` currently renders with `gpt-image-2`. Done when model and effort are explicit.

4. Run the isolated worker.

   Resolve `scripts/run_codex_imagegen.py` relative to this `SKILL.md`. Pass the brief file, a non-existing destination, and any selected images in their documented order:

   ```bash
   python3 <skill-dir>/scripts/run_codex_imagegen.py \
     --brief <brief.md> \
     --out <final.png> \
     --model gpt-5.6-sol \
     --effort high \
     --image <edit-target-or-reference.png> \
     --open
   ```

   Omit `--image` for generation without visual inputs. Repeat it for multiple inputs, up to five. Use `--overwrite` only when the user explicitly requested replacement. The runner supplies `--` before Codex's positional prompt so `--image` cannot consume it. Done when the runner reports a validated PNG at the requested path.

5. Review the original output.

   Inspect the full-resolution output with the current agent's image-viewing capability. When the user wants a desktop preview, use `--open` or run `xdg-open <final.png>` on Linux. Open the original file directly; do not resize it or create a preview derivative. Check subject, composition, palette, counts, text, input roles, invariants, and exclusions. Done when every material requirement is accepted or identified for revision.

6. Iterate with a bounded edit.

   Write a targeted delta brief, attach the previous full-resolution output with `--image`, label it as the sole edit target, and repeat every invariant that must survive. Use a fresh isolated run rather than a Codex continuation. Save non-destructively with a versioned filename unless replacement was explicit. Done when the selected final is reviewed and stored outside the worker home.

7. Report the result.

   Return the final path, model and effort, whether the task was generation or editing, the authoritative brief, and any remaining fidelity limitation. Do not claim exact compliance that was not visually checked.

## Worker Boundary

The bundled runner:

- uses a reusable machine-local home selected by `CODEX_IMAGEGEN_HOME` or a platform state-directory default;
- seeds file-backed authentication from the ordinary Codex home only when the worker has no login;
- keeps Codex's hosted image-generation tool enabled while ignoring user config, project rules, personal skills, MCPs, apps, and plugins;
- sends the brief directly through stdin and stages only explicitly selected images;
- disables model-visible shell execution, browser/computer tools, web search, code mode, and subagents;
- restricts filesystem reads to minimal system paths and the disposable run directory, so local image browsing can reach only staged inputs;
- uses `--ephemeral`, denies approval escalation, and permits one built-in image call per run;
- serializes runs that share a worker home and clears the previous built-in output at the next run;
- copies the generated PNG unchanged to `--out` and retains the built-in source until the next run;
- never switches to `scripts/image_gen.py`, the Image API, or another service.

If authentication is unavailable, follow the runner's worker-login instruction. Never request an API key for the built-in path and never ask the user to paste credentials into chat.

For multiple requested assets, invoke the runner once per asset. Shared worker homes serialize safely. Parallel runs require distinct `--worker-home` paths and must be cleaned after their outputs are copied.
