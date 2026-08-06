# Log

## 2026-08-06 - Initial Design

- Chose a parent-orchestrated boundary: the calling agent gathers context and Codex receives only one authoritative brief and selected images.
- Chose a reusable isolated worker home rather than unmanaged temporary homes, with serialized runs and bounded latest-output retention.
- Kept the package portable through platform defaults and `CODEX_IMAGEGEN_HOME`; Mindframe-Z is an installation mechanism, not a runtime dependency.
- Used direct stdin for text context and repeated `--image` arguments for edit targets and references.
- Required `--` before the Codex prompt after discovering that `--image` greedily consumed a positional prompt without it.
- Preserved full-resolution originals and defined desktop preview as opening the original, not resizing it.
- Prohibited automatic SDK, Image API, API-key, and external-service fallback.
- Defaulted to `gpt-5.6-sol` at `high` based on user preference for its observed expressiveness.
- Recorded Luna, Terra, and Sol tendencies from three matched images each while preserving the stronger conclusion that within-model image randomness was roughly as large as between-model variation.
- Kept model selection separate from renderer identity: all inspected built-in calls route to `gpt-image-2` in the tested Codex version.
- Replaced prompt-only filesystem restraint with disabled shell/browser/computer/web-search/code-mode/subagent tools and a split-filesystem profile after confirming that Codex's legacy read-only sandbox otherwise permits host reads and Codex 0.146.1 cannot disable `view_image`.
- Made managed directories symlink-rejecting, moved atomic auth seeding under the worker lock, made output publication atomic, and stopped printing raw child diagnostics on failure.
