# Session Brief evaluations

## Status

The focused stdlib suites cover OpenCode adapter-version-2 checkpoint validation, non-OpenCode branching, harness-specific authority locators, acceptance truth, and exact checkpoint transport. Live creation and refresh remain conditional on a disposable or explicitly authorized artifact destination and read-only source access.

## Invocation

### Positive prompts

- "Create a refreshable Session Brief for this prior session."
- "Refresh the existing Session Brief for session `ses_x`."

The model loads Session Brief, Agent Sessions, and Context Transfer. It resolves one source, destination, artifact identity, consumer, and edit authority.

### Adjacent negative prompts

- "Summarize this conversation."
- "Write a handoff."
- "Preserve this as a Practice."
- "Add these sessions to a thread."
- "Checkpoint the active work unit."

Session Brief leaves these requests to their owning workflows.

## OpenCode creation

**Assertions:** One full V2 snapshot covers the parent and direct children. The artifact keeps outer `state_version: 2`, declares `source.adapter_version: 2`, transports the exact top-level checkpoint through the helper, records separate activity, acceptance, and movement, and passes validation.

## No-op refresh

**Assertions:** One delta uses the exact stored checkpoint. Complete empty appends preserve narrative, still pass the returned checkpoint through the helper, update boundary fields, and add one concise no-op history entry.

## Append refresh

**Assertions:** One accepted append-only delta merges only material new meaning into semantic sections, advances through all scanned evidence, preserves nonterminal locators, transports the exact advanced checkpoint, and remains reusable.

## Rebuild

**Assertions:** Missing, malformed, legacy, or unsupported OpenCode checkpoint state never drives delta. A rejected delta contributes no incremental evidence. One full snapshot rebuild preserves valid narrative, original `brief.created_at`, and useful history while replacing incompatible state and stale claims. A visible gap remains when rebuild cannot complete.

## Movement and guard rejection

**Assertions:** Movement after an accepted boundary does not retroactively reject the boundary. Detected or unknown movement creates a visible gap and incomplete coverage. A rejected session guard requires overall rejection, a reason or gap, and incomplete evidence. The currently executing parent records detected movement and uses no interpretation child.

## Harness-specific validation

**Assertions:** OpenCode validates adapter version 2, the complete checkpoint shape, topology and session sets, compaction equality, nonnegative watermarks, and V2 parent message locators. Claude or another harness accepts native compact JSON and native parent locators without OpenCode fields.

## Authority

**Assertions:** Decisions and Corrections are logical list items with a direct parent locator. OpenCode uses session ID, sequence, message ID, and optional content identity or index. Child-only locators fail. Post-write inspection verifies a human or user role.

## Exact checkpoint transport

**Assertions:** The helper reads only top-level `checkpoint`, serializes compact insertion-ordered JSON, replaces only the controlled line, preserves unrelated bytes and the final newline, skips equality rewrites, and atomically updates changed artifacts. Missing checkpoint, malformed JSON, malformed markers, duplicate controlled keys, multiline state, symlink targets, and invalid UTF-8 fail without writing.

## Privacy and cold consumer

**Assertions:** The brief contains no transcript copy, reasoning body, secret, broad tool output, or unapproved path. A cold consumer can identify purpose, current state, accepted direction, observed work, validation, unresolved state, gaps, and next refresh position.
