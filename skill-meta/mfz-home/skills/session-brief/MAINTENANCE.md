# Maintenance

## Dependencies

The runtime skill depends on model-invoked `agent-sessions` for read-only evidence and `context-transfer` for consumer and destination fit. `references/artifact-contract.md` owns the artifact schema. `scripts/validate-session-brief.py` and `scripts/set-adapter-state.py` use only Python stdlib.

OpenCode depends on Agent Sessions adapter version 2. The adapter owns source identity, direct-child topology, terminal sequences, counts, message and session updates, compaction state, prefix and metadata guards, fork provenance, and optional event and inbox watermarks. Session Brief owns acceptance, synthesis, storage, authority, and lifecycle.

## Artifact and migration contract

The outer artifact version remains `2`. OpenCode requires `source.adapter_version: 2` and the exact compact version-2 checkpoint in an actual YAML `|-` block. Other harnesses retain native compact checkpoint state and locator rules.

Missing, malformed, legacy, or unsupported OpenCode state cannot drive incremental refresh. Run a full snapshot with no conversion. Preserve valid narrative, original creation time, and useful history, then replace stale claims and checkpoint state.

Accept only append-only delta. A `rebuild_required` result contributes no incremental evidence. Preserve movement and rejection gaps.

All accepted OpenCode checkpoint state enters through `set-adapter-state.py <brief-path> <adapter-output-path>`. The helper reads top-level `checkpoint`, validates one controlled block, rejects symlinks and invalid UTF-8, preserves unrelated bytes and newline state, skips equality rewrites, and atomically replaces changed artifacts. The validator remains the semantic gate.

OpenCode authority locators use session ID, sequence, message ID, and optional content identity or index. Other harnesses use native parent locators. Syntax validation cannot prove human authority; post-write inspection verifies the parent message role.

Checkpoint changes couple the Agent Sessions adapter, artifact contract, validator, transport helper, and tests. Preserve the independent non-OpenCode branch. The outer artifact version and OpenCode adapter version are separate compatibility decisions.

## Verification

Run:

```bash
python3 -m py_compile skills/active/session-brief/scripts/validate-session-brief.py skills/active/session-brief/scripts/set-adapter-state.py skill-meta/mfz-home/skills/session-brief/test_validate_session_brief.py skill-meta/mfz-home/skills/session-brief/test_set_adapter_state.py
python3 -m unittest discover -s skill-meta/mfz-home/skills/session-brief -p 'test_*.py'
python3 skills/active/session-brief/scripts/validate-session-brief.py <brief-path>
```

These commands do not establish a current pass. For live evaluation, use an authorized disposable artifact and read-only source acquisition. Inspect authority roles and privacy separately from validator success. [Historical evidence](LOG.md) retains the fingerprint-copy defect, transport remediation, and older live runs; [EVALS.md](EVALS.md) distinguishes those results from current checkpoint expectations.
