# Maintenance

## Dependencies

The runtime skill depends on model-invoked `agent-sessions` for read-only
evidence and its OpenCode Bundle extractor, and on `context-transfer` for
consumer and destination fit. The artifact schema is in
`references/artifact-contract.md`. The validator is
`scripts/validate-session-brief.py` and uses only Python stdlib. The
`scripts/set-adapter-state.py` transport helper also uses only Python stdlib and
must run between artifact writing and validation. OpenCode's preferred
interpretation path additionally depends on a native read-only `explore` agent;
other harnesses may use an equivalent child or run directly.

Bundle is a behavioral dependency, not an optional optimization for OpenCode.
It owns source identity, direct-child topology, four-stream cursors, counts,
terminal identities, creation-prefix fingerprints, pagination, and pin guards.
Session Brief owns acceptance, synthesis, storage, and lifecycle. Do not copy
generic Bundle maps into a second frontmatter structure.

## V2 Schema And Migration

The artifact `state_version` is exactly `2`. The adapter state is stored as the
exact compact JSON text returned by Bundle's `next_state` in an actual YAML `|-`
block. Refresh passes that content as `--state-json '<exact-json>'`; a temporary
file is only a transport source whose content is substituted into that argument,
never a Bundle path. For current OpenCode Bundle state, the valid nested generic
`version` remains `1` and must not be confused with Session Brief
`state_version: 1`. Brief-owned frontmatter records source activity at pin,
accepted evidence at pin, post-pin movement, and overall and per-session guard
acceptance separately.

A missing, Session Brief `state_version: 1`, malformed, incompatible, or
guard-invalid stored state cannot drive Delta. The workflow performs a full
rebuild from empty adapter state with no compatibility conversion. It preserves
the original brief creation time and useful extraction history, then writes a
valid v2 artifact. A valid nested OpenCode Bundle `version: 1` is not a Session
Brief `state_version: 1`. If a source or child is missing, the result remains
visible as a gap rather than being silently treated as quiescent or accepted.

The activity/evidence/movement split is deliberate: an active source can provide
a consistent accepted pin, while movement is an observation about what happened
after the boundary. For the currently executing OpenCode parent, Bundle and later
work necessarily move the source after the pin, so the workflow skips the Explore
child, records detected movement and a gap, and leaves pin acceptance independent.
The authority split is also deliberate: only a direct parent human or user turn
can establish accepted Decisions or Corrections; child prompts, child reports,
and successful tools can support evidence but cannot manufacture user acceptance.

All returned Bundle states, including no-op refreshes, enter the brief through
`set-adapter-state.py <brief-path> <bundle-output-path>`. It requires one exact
top-level `extraction:` declaration, one nested controlled marker, and one
indented content line; it rejects syntactic duplicates and malformed key or
scalar variants, brief symlinks, and non-UTF-8 briefs before writing. It preserves
unrelated bytes and final-newline state, skips an exact-equality rewrite, and
atomically replaces changed briefs. It provides transport integrity only;
semantic validation still belongs to `validate-session-brief.py`. The observed
manual-copy fingerprint typo is the reason this boundary is mandatory. Live
empty-state recovery and the following no-op both confirmed the helper path.

## Change Procedure

1. Read the runtime package, this record, the artifact contract, and the current
   Agent Sessions Bundle contract before changing extraction state.
2. Classify the change as invocation, destination, Bundle dependency, v2 schema,
   synthesis, authority, movement, or validator behavior.
3. For OpenCode creation or rebuild, preserve the empty-state one-Bundle path; for
   refresh, preserve exact state extraction and one-Bundle reuse through
   `--state-json '<exact-json>'`.
4. Update the transport helper, contract, runtime workflow, focused tests, and
   affected authoring-record scenarios together.
5. Keep targeted reads bounded and consequential; never add raw reasoning,
   secrets, or generic cursor/guard duplicates to the brief.
6. Run the validator tests, compile the script and tests, inspect an artifact and
   diff, and perform the cold-consumer review before reporting.
7. Record consequential decisions or reversals in `LOG.md`.

## Validator Tests

The focused stdlib test uses the validator's public `validate_text` and
`validate_path` functions. It currently contains 25 test cases and additional
assertions covering the complete
truth table, current-source movement with accepted pin state, missing source,
Session Brief `state_version: 1`, malformed four-stream state, counts, terminal
maps, fingerprints, parent/session topology, controlled-key rejection, actual
`|-` style, standard-JSON constants and lexical compactness, legal non-OpenCode
escapes/raw Unicode, fence-aware exact h2 sections, numbered multiline authority
items, scalar-only flat descriptive records and structured gaps, guard
reason/locator shape rejection, independently asserted rejected-session reason,
overall-status, visible-gap, and `complete` failures, blank-separated top-level
prose rejection, supplemental parent-plus-child locators, and child-only locator
rejection. It does not claim a privacy-content test. Keep these tests repeatable
and independent of live stores or third-party packages.

The focused helper and validator-path suites separately cover exact replacement
with byte and final-newline preservation; no-write exact equality; symlink
refusal; malformed Bundle JSON; missing or non-object `next_state`; syntactic
controlled-key duplicates and malformed markers, comments, scalar styles, and
indentation; malformed or multiline blocks; non-UTF-8 briefs; Unicode and
escapes; source-fingerprint typo correction; and actionable nonzero CLI errors.
These are static tests; the retained live evaluation separately establishes a
successful no-op refresh.

## Verification

Run:

```bash
python3 -m py_compile skills/active/session-brief/scripts/validate-session-brief.py skills/active/session-brief/scripts/set-adapter-state.py skill-meta/mfz-home/skills/session-brief/test_validate_session_brief.py skill-meta/mfz-home/skills/session-brief/test_set_adapter_state.py
python3 -m unittest discover -s skill-meta/mfz-home/skills/session-brief -p 'test_*.py'
python3 skills/active/session-brief/scripts/validate-session-brief.py <brief-path>
```

Static review also confirms the exact adapter-state block, source and session
identity, separate activity/evidence/movement fields, guard truth table, required
narrative sections, direct parent locator syntax, and visible diff. The v1 live
baseline and representative OpenCode v2 Bundle, migration, authority, movement,
guard-rejection, recovery, and no-op scenarios are complete. Historical creation
without an existing artifact, privacy-sensitive content, Claude JSONL refresh,
and other non-OpenCode adapters remain unrun.
