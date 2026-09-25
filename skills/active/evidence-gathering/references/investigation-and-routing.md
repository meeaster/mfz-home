# Investigation and routing

| Evidence family | Suitable methods | Delegated role when available and authorized |
| --- | --- | --- |
| Static local source | File search, targeted reading, relationships across files | `explore` |
| External contracts | Official documentation, release records, registry metadata, upstream source | `research` |
| Runtime or system facts | Commands, API reads, browser inspection, bounded experiments | `inspect` |
| Session facts | Named-session retrieval under `agent-sessions` | `inspect` |
| Evaluation of session behavior | Evidence plus explicit evaluative scope | `session-analyst` |

- Ground version-sensitive claims in the applicable installed version, release, or compatibility settings and primary evidence. A snippet or unversioned page alone may be insufficient.
- Use known canonical sources and permitted reference clones. A disposable clone needs both a useful source-inspection reason and authority under workspace rules.
- Distinguish observations from inferences, proposals, and accepted decisions. Preserve consequential disagreement and source limits.
- For delegation, supply the bounded question, decision context, known locators, coverage, output ownership, and stops. Split units only when materially different access or methods justify it. Avoid overlap with active investigations.
- A static `explore` assignment must not require shell commands. Route command-derived facts to a capable role; file-search-only work needs no Git-status gate.
- At a tool or depth boundary, return the smallest missing evidence request to the caller. Do not bypass permissions or change roles to defeat a denial.
- Broader access, external mutation, credential inspection, source edits, publication, or cleanup are not implied by research authority.
