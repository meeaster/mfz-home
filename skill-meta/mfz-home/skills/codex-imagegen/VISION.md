# Vision

Agents without a native image tool need a reliable way to use Codex's account-backed built-in image generation without requiring an OpenAI API key or exposing an entire project and personal Codex environment to a second exploratory agent.

## Priorities

The calling agent owns context gathering, design intent, attachment selection, validation, and iteration. Codex receives one bounded brief and selected images, with enforced isolation from project exploration and personal configuration. Each request starts fresh; reusable worker state must not introduce conversation continuity.

The user prefers Sol's observed expressiveness. Treat model preferences as evidence-bounded and visually review every result; reasoning-model choice does not establish rendering quality.

Preserve full-resolution originals and unrelated composition during bounded edits. Success produces one validated PNG at the requested destination, with model and effort reported and visual acceptance owned by the calling agent. The workflow uses Codex's built-in image path without automatic API-key or external-service fallback.

## Portability

The package must remain usable without Mindframe-Z or personal workspace assumptions. Platform support and source-version limitations belong in maintenance guidance.

The skill targets raster assets, not deterministic diagrams, vector assets, or pixel-exact rendering.
