# Codex Imagegen Evaluations

Record Codex CLI version, reasoning model, effort, built-in renderer when known, runner revision, platform, and observed artifacts for live evaluations.

## Context Boundary

**Prompt:** Generate an image for an HTML page whose source, styles, and copy are available to the calling agent.

**Assertions:** The calling agent inspects the page and writes a self-contained brief before Codex starts; Codex receives the brief through stdin, sees only selected staged images, starts in a disposable run directory, has no model-visible shell/code-mode/subagent/browser/computer tool, and has a local image viewer restricted to the run directory and minimal system paths.

## Built-In Generation

**Prompt:** Generate one raster illustration from a detailed brief without input images.

**Assertions:** The runner uses an isolated worker home, hosted image tooling, `--ephemeral`, ignored user config and rules, disabled apps and plugins, a restricted read-only filesystem profile, no approval escalation, exactly one successful built-in image result, no API key, and one validated PNG copied unchanged to `--out`.

## Image Editing

**Prompt:** Attach one existing PNG as the sole edit target and request one bounded visual change.

**Assertions:** The CLI command places `--` after all `--image` values; the brief labels Image 1 as the edit target and repeats invariants; the output preserves unrelated composition; the source image remains unchanged; and the result uses a versioned path unless replacement was explicit.

## Multiple Image Roles

**Prompt:** Generate or edit using an edit target, style reference, and compositing source.

**Assertions:** The brief and repeated `--image` arguments use the same order, every role is explicit, no more than five images are accepted, and Codex does not discover additional images.

## Original Preview

**Prompt:** Ask to preview a generated image on a Linux desktop.

**Assertions:** `--open` invokes `xdg-open` on the final full-resolution PNG; no resized or derivative preview is created; and failure to find a viewer is reported without invalidating the generated asset.

## Reusable State

**Prompt:** Run two sequential generations through the default worker home.

**Assertions:** Authentication and official system skills are reused; runs are serialized; the second run receives no conversation history; temporary run inputs are removed; the prior built-in generated image is cleared only at the next run; the previously copied final remains intact; and last-run diagnostics are bounded to one set.

## Parallel State

**Prompt:** Run multiple requested variants concurrently.

**Assertions:** Every concurrent process uses a distinct explicit `--worker-home`; outputs are copied before worker cleanup; no shared SQLite, auth, generated-image, or cleanup race occurs; and credential-bearing temporary homes are removed afterward.

## Model Default

**Prompt:** Run without specifying model or effort.

**Assertions:** The runner selects `gpt-5.6-sol` with `high` effort and reports both values. The calling agent still visually validates requirements and does not claim that Sol changes the underlying image renderer.

## Model Comparison

**Prompt:** Compare Luna, Terra, and Sol for this worker role.

**Assertions:** Every arm uses the same brief, effort, isolation, and number of samples; at least three samples per model are reviewed; within-model image randomness is separated from tool-call behavior and brief fidelity; and findings are recorded as observed tendencies rather than guarantees.

## No Fallback

**Prompt:** Cause the built-in tool or authentication to fail.

**Assertions:** The runner returns a diagnostic and nonzero status without requesting `OPENAI_API_KEY`, invoking an SDK script, using another service, or changing models silently.
