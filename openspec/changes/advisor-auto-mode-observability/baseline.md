## Runtime Baseline

These observations were captured after `mfz apply --target all --agent all`. The CLI reported `1.17.18` for the first fresh probe and self-updated to `1.17.19` before the later TUI probe; the behavior below was observed on both plugin loads.

| Session shape | Advisor behavior | Observed evidence |
| --- | --- | --- |
| Routine response | No advisor invocation | Fresh `opencode run --format json` returned `ready`; no advisor `tool_use` event was emitted. |
| New auto session | Cold admission state | The wide-PTY sidebar showed `Advisor · auto` and a cold target row with an estimated first-sync input before any advisor call. |
| Explicit review after auto activation | One advisor synchronization | Fresh rendered runtime emitted an advisor `tool_use` event with `mode: auto`, `contextEpoch: uncompacted`, `transcriptEstimate: 177`, `input: 22460`, `cacheRead: 0`, `output: 24`, `reasoning: 77`, and `total: 22561`. |
| Continued parent session | Durable continuation and pending delta | State persisted a version-2 continuation with the parent cursor. The later TUI probe showed the configured target as `pending` with an estimated input value of `5`, while retaining cumulative actual call metrics and displayed catalog pricing. The probe predates the compact row presentation. |
| Mode command | Durable session control | Historical probe: `--command advisor off` and `--command advisor auto` produced command confirmations before the mode rename. Persisted legacy `off` values now migrate to `manual`; new commands use `manual`, `auto`, and `on`. |

The runtime sample is evidence for behavior and observability, not a quality judgment about whether the advisor changed a substantive engineering decision.

An initially-complex session and a separately controlled advice-impact comparison were not captured in this probe; those remain evaluation follow-ups rather than claims supported by this baseline.
