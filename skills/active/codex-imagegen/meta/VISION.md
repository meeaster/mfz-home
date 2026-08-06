# Vision

## Problem

Agents without a native image tool need a reliable way to use Codex's account-backed built-in image generation without requiring an OpenAI API key or exposing an entire project and personal Codex environment to a second exploratory agent.

## Intended Behavior

The calling agent owns context gathering, design intent, attachment selection, validation, and iteration. It delegates one complete image brief and at most five explicit images to a fresh Codex turn. Codex runs inside a reusable isolated worker home with hosted image generation and file-backed login, but without user configuration, project instructions, MCPs, apps, plugins, shell/browser/computer tools, web search, subagents, or conversation continuity. A split-filesystem policy confines the remaining local image viewer to staged inputs and minimal system paths.

The default worker model is GPT-5.6 Sol at high reasoning because the user prefers its more expressive observed outputs. Model guidance remains evidence-bounded: Luna was more structurally consistent, Terra tended toward clean legibility, and Sol showed more variation. All use the same built-in GPT Image renderer, so the skill treats visual review as mandatory rather than inferring quality from model choice.

The worker copies an unchanged full-resolution PNG to a caller-selected destination and can open that original file for review. Editing uses ordered image attachments and explicit invariants. The workflow never falls back to the OpenAI SDK, Image API, or another image service.

## Portability

The package has no Mindframe-Z runtime dependency, absolute personal path, or project-specific assumption. Its Python runner uses only the standard library, platform state-directory conventions, environment-variable overrides, the locally installed Codex CLI, and the user's normal Codex authentication source.

## Success

A successful run gives Codex only the bounded brief and selected images, produces exactly one validated PNG outside the worker home, preserves the original resolution, exposes the model and effort used, and leaves the calling agent responsible for accepting or revising the visual result.

## Non-Goals

- Deterministic diagrams, vector assets, or pixel-exact rendering.
- Independent project exploration by Codex.
- API-key image generation or automatic fallback.
- Treating small-sample model tendencies as permanent model personalities.
