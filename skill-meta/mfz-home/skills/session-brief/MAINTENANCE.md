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

## Change procedure

1. Read the runtime package, artifact contract, complete authoring record, and Agent Sessions checkpoint contract.
2. Define intended behavior, invocation, authority, adjacent cases, failures, and observable evaluations.
3. Update the runtime workflow, contract, validator, helper, tests, and authoring record together when checkpoint semantics change.
4. Preserve non-OpenCode branches unless the accepted change includes them.
5. Keep raw evidence, reasoning, secrets, and generic checkpoint maps out of narrative and uncontrolled frontmatter.
6. Run focused tests, inspect a representative artifact and diff, and apply the cold-consumer test.
7. Add consequential decisions or reversals to `LOG.md`; preserve historical entries.

## Verification

Run:

```bash
python3 -m py_compile skills/active/session-brief/scripts/validate-session-brief.py skills/active/session-brief/scripts/set-adapter-state.py skill-meta/mfz-home/skills/session-brief/test_validate_session_brief.py skill-meta/mfz-home/skills/session-brief/test_set_adapter_state.py
python3 -m unittest discover -s skill-meta/mfz-home/skills/session-brief -p 'test_*.py'
python3 skills/active/session-brief/scripts/validate-session-brief.py <brief-path>
```

Static review confirms the controlled checkpoint block, per-harness adapter branch, guard truth table, required sections, native authority locator syntax, privacy boundary, destination authority, and visible diff. Live evaluation uses a disposable artifact only when local mutation is authorized and source acquisition remains read-only.
