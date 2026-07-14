## Runtime Baseline

These observations were captured after `mfz apply --target all --agent all`. Earlier probes used CLI versions `1.17.18` and `1.17.19`; the current fresh probe used CLI `1.17.20` with the rendered advisor plugin.

| Session shape | Advisor behavior | Observed evidence |
| --- | --- | --- |
| Routine response | No advisor invocation | Fresh `opencode run --format json` returned `ready`; no advisor `tool_use` event was emitted. |
| New auto session | Cold admission state | The wide-PTY sidebar showed `Advisor · auto` and a cold target row with an estimated first-sync input before any advisor call. |
| Explicit review after auto activation | One advisor synchronization | Fresh rendered runtime emitted an advisor `tool_use` event with `mode: auto`, `contextEpoch: uncompacted`, `transcriptEstimate: 177`, `input: 22460`, `cacheRead: 0`, `output: 24`, `reasoning: 77`, and `total: 22561`. |
| Continued parent session | Durable continuation and pending delta | State persisted a version-2 continuation with the parent cursor. The later TUI probe showed the configured target as `pending` with an estimated input value of `5`, while retaining cumulative actual call metrics and displayed catalog pricing. The probe predates the compact row presentation. |
| Mode command | Durable session control | Historical probe: `--command advisor off` and `--command advisor auto` produced command confirmations before the mode rename. Persisted legacy `off` values now migrate to `manual`; new commands use `manual`, `auto`, and `on`. |

The runtime sample is evidence for behavior and observability, not a quality judgment about whether the advisor changed a substantive engineering decision.

The current probe additionally verified the `<leader>v` picker and the `Advisor: Change mode` palette action in a 200x50 PTY. `D` persisted `auto` while leaving the picker open, Enter persisted the session override and closed it, Escape closed without a further change, and a restart showed the resulting values in the sidebar. The global default was restored to `on` after the probe.

The context-reset probe then used the session summarize API to create a real compaction marker and summary. A fresh 200x50 TUI process rendered `auto · default on`, `reset · ~603 tokens`, and retained the completed advisor metrics (`Input: 17.5K`, `22.5K cached`, `Output: 74`, `Reasoning: 237`, and `$0.108`). Debug logging recorded plugin load, view mount, history loading, pricing refresh, and view unmount for the reset session.

## Controlled Comparison

These read-only sessions were captured on 2026-07-14. No session edited repository files or ran a mutating command.

| Session shape | Mode | Advisor call and pending estimate | Actual usage and timing | Next action after advice |
| --- | --- | --- | --- | --- |
| Routine mode inspection | `auto` with an explicit session override | No advisor call; local pending estimate `~4,432` tokens. | No provider usage or call timing. | Executor summarized the configured modes directly. |
| Initially complex architecture review | `on` | One call; estimated pending input `61,736` tokens. | `51.9s`; input `79,660`, cache-read `3,584`, output `214`, reasoning `2,003`, total `85,461`, cost `$0`. | Yes. The executor recorded the advisor's proposed deterministic continuation-race validation as its next follow-up. |
| Late-emerging continuation risk | `auto` with an explicit session override and no continuation | No advisor call; local pending estimate `~23,019` tokens. | No provider usage or call timing. | No advisor advice changed the action; the executor independently identified the same race and proposed the same test. |

The no-call rows are intentional observations of workload triage. Local estimates came from the shared transcript planner; provider usage and timing exist only for completed calls. The comparison does not establish that advice improved the engineering outcome; it records whether the next action visibly followed an advisor response.
