# Playbook: prepare and maintain a working evidence packet

Substantive design work starts with a scoped packet: new designs, changes to direction, requirements, decisions or the plan, research, and meeting or email intake. Prepare it while the change is being discussed, before handing it to an author. Reuse and refresh it throughout that body of work. Wording-only and local presentation fixes use the editing workflow without a separate packet.

The purpose is broad consideration at lower authoring cost, not just avoiding a context limit. The design records and original sources remain authoritative. The packet is a working view, kept in the session or working-artifact location the user's setup supplies, outside the published design. Preparation changes neither design records nor source systems; the task's research or intake workflow still owns those writes and approval gates.

## 1. Establish scope and coverage

Have a read-only gathering worker read `design.json` in full when it exists, inspect the design's evidence, meetings, changes and page/component topics, and map the proposed change to requirements, decisions, questions, facts, risks, flows and the plan. Follow repository and knowledge-base guidance before looking up their sources. For a new design, start with the request and available sources instead.

Scope is a starting question, not permission to ignore consequences. Search across the whole current design for dependencies, contradictory claims and affected consumers; then identify all source material relevant to that closure. Include evidence that challenges the proposed change. Sources outside the closure get a reason for exclusion; uncertain relevance gets investigated. Generated duplicates and layout code need not be read merely to count them as covered.

Record the design/version, source identities and read boundaries, relevant records/topics, source locations, and coverage gaps. Before refreshing an existing packet, compare these boundaries with the current records, sources and conversation. A source's observation date stays attached to its claim; refreshing the packet does not make an old observation current.

**Done when:** the change and its cross-design consequences have an explicit coverage map, with every relevant source assigned or a named access gap. A gap is not evidence that nothing exists.

## 2. Gather by bounded domains

Delegate source reading to inexpensive gathering workers using the user's configured routing. Models and harness-specific dispatch mechanics belong to that setup, not this playbook. One worker can cover a small scope; fan out independent domains when the material is substantial. Partition by questions and dependencies, rather than equal file counts. A large domain can be subdivided before its worker has to repeatedly compact.

Give each worker the same proposed change, accepted direction and authority boundaries, plus its source ownership, dependencies on other workers and expected result. Workers read all relevant content in their assigned domain, follow material consequences beyond the initial list, and report overlaps or missing sources. Reuse existing research; new research or additional access follows the task's authority and research workflow. Workers gather and reconcile evidence, not choose architecture or accept requirements.

Each returns a bounded, source-linked explanation with:

- Findings, exact support or sufficient excerpts, original source locators, observation dates, applicable versions and limitations.
- Human statements and accepted proposals separately from colleague guidance, AI advice and unresolved choices.
- Constraints that affect alternatives, failure behavior, interfaces, permissions, rollout, recovery, ownership and validation—not just a list of questions marked unknown.
- Relevant record IDs and topics, conflicts, exclusions and completed versus incomplete source coverage. Group IDs only when the same disposition and reason actually apply to each.

**Done when:** every assigned domain has complete relevant coverage or explicit gaps, and each finding's meaning and source can survive without the worker's transcript.

## 3. Compile the packet

Use a fresh compiler when gathering has accumulated broad context. It reads the worker results, reconciles their interfaces, and opens targeted original passages for conflicts, ambiguous authority or missing consequential detail. It records those reopens and reasons. A worker's result is evidence of its reading, not an independent confirmation of the source's underlying system.

Keep three linked sections or files, with one home for each claim:

| Part | What the author needs |
| --- | --- |
| Working brief | Connected problem, goals, exclusions, audience assumptions, current/proposed behavior, accepted direction, requirements, and the change under discussion. Preserve why the work matters and relevant dated scale baselines separately from forecasts or selected settings. |
| Evidence and constraints | Supported claims with classification, scope/date/version, precise source locators and sufficient detail to author accurately. Retain behavior and distinctions that change a design choice: modes, product contracts, trust/read boundaries, failure/recovery semantics, change compatibility, permissions and telemetry limitations. |
| Coverage and impact | Relevant IDs/topics and their disposition, dependencies, conflicts, source boundaries, exclusions and gaps. For a wholesale rewrite, account for every current record and page topic; the private carryforward map is not the new design's narrative. |

Preserve requirement priority, acceptance, provenance and demonstrated coverage as separate properties. Keep data contracts, hosting direction and rollout scope distinct. An unresolved choice must retain the known constraints around it: “destination undecided” does not replace different formats, permissions or failure behavior. Keep useful contact routes and expressed ownership preferences dated and conditional; they are not final assignments. Model provenance is not decision authority or a confidence grade.

Avoid copying complete reports, duplicating the brief in every ledger, or compressing to a rigid token cap. State packet size and required versus optional reads; semantic sufficiency determines length. Original citations provide traceability, not a default rereading checklist. Keep local source locations in the working packet; the design's normal citation/privacy rules govern what is later published.

**Done when:** a fresh author can explain the system and the proposed change, preserve constraints and authority, and identify what remains unresolved without reconstructing the original source pile.

## 4. Check preservation

Check the packet against its coverage map and original sources before authoring. For broad or consequential changes, use independent, bounded domain reviewers; they inspect originals, not just the compiler's inventory. A small scope can receive a direct source comparison. Keep review assignments bounded rather than giving one reviewer the entire pile.

Judge useful meaning, not sentence retention: identify material omissions, distortions, unsafe generalizations and safe compression. Verify source locators resolve to the supporting passages. Check inherited givens and priorities, explicit exclusions, relevant quantitative baselines, product/mode distinctions, raw-data and trust boundaries, failure/rollback behavior, and the known constraints around open questions. Complete ID counts alone do not establish preservation.

Repair material losses and recheck the affected domains. Report ready, ready with named gaps, or blocked. Genuine design unknowns can remain open; missing packet support for a consequential claim must be repaired or clearly withheld from authoring. Review of the packet does not establish production behavior or replace review of the resulting design.

**Done when:** no known material preservation defect remains, and the author is told exactly which gaps constrain the work.

## 5. Maintain it during discussion and edits

The lead detects scope changes as the user talks; the user need not announce them. Record exploration, proposed changes and human acceptance distinctly. When a new point affects a dependency or challenges a claim, dispatch bounded gathering to update those packet sections and check for further consequences. Fan out when several domains are affected. Reconcile the updated packet before reasoning or writing that depends on it.

Reuse supported material within its recorded scope. A changed design/version, new source, conflicting finding, altered requirement or new user direction triggers a freshness and impact check, not automatic reuse and not an automatic full reread. Keep packet source boundaries and gaps current across handoffs. After accepted changes land, reconcile the packet with the resulting records or retire it; a later session checks freshness before using it.

**Done when:** the packet reflects the latest relevant discussion and source state, and every scope extension has coverage or an explicit pending investigation.

## 6. Hand off and author

Give the author the current packet, agreed changes, remaining gaps and the applicable authoring workflow. The author reads `design.json` in full when present, the change entries since the last handoff, affected records/pages/components, and the skill references needed for the edits. It relies on supported packet claims without automatically reopening all evidence, transcripts, meetings or research reports.

Reopen an original when a contradiction appears, consequential support/detail is missing, authority is ambiguous, freshness could change the claim, or writing introduces a claim outside packet coverage. Resolve broad new dependencies through gathering rather than expanding the author's context indiscriminately. Use documented build/version commands; implementation code is needed only when the procedure fails or its contract is unclear.

Apply only what the task permits: meeting proposals still wait for the human, research records findings through its playbook, and recommendations remain advice. After authoring, run the normal whole-folder consistency sweep, checker, semantic review and applicable rendered checks. Update the packet's references if record numbering changes; earlier IDs stay in private lineage, not current prose.

**Done when:** the resulting design agrees with the accepted change and supported evidence, affected consumers are consistent, and verification gaps are reported. Saving a packet is not authorization to change or publish the design.

## Without delegation

When subagents are unavailable or disallowed, prepare the same packet locally in bounded source passes and disclose that fallback. For work that cannot preserve relevant coverage within available context, return the unexamined domains and request a narrower assignment or delegation; compaction is not proof of complete consideration. The packet format and authority boundaries stay the same.
