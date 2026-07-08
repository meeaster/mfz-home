# Session ses_0ee9a898affeZLxl2ZX93omXfS — Thermo Nuclear Review of Lapdog Feature

## Thread Relevance

This session performs a thermo-nuclear code review of two lapdog-thread-observability feature branches against the DataDog APM overlay charter, comparing cost span emission (msgpack to lapdog), container lifecycle management, and OpenCode plugin + Claude Settings hooks instrumentation across both branches, yielding a ranked recommendation with blockers.

## Gaps

The thermo-nuclear review skill's full rubric is not captured in the dossier — only the assistant's summarized findings from it. Raw file contents for the branches were retrieved by the assistant but are not included here; only inline observations from those reads appear. No actual test run output is present — the dossier reports only that `pnpm test:thread` and `pnpm check` were marked green in tasks.md. The `feat/lapdog-prototype` branch was identified but not deeply reviewed. Actual OpenCode event payload shapes needed for validation were not captured.

## Decisions

- [2026-06-29 04:24] Rank `feat/lapdog-thread-observability-mmm3` as the better branch over `feat/lapdog-thread-observability-dsv4pro` — mmm3 has stronger cost-span implementation, better test coverage, cleaner docker arg extraction, and more complete OpenCode event mapping. dsv4pro is smaller but misses too much core behavior and would require more reconstruction than cleanup. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)

## Learnings

- [2026-06-29 04:21] Two feature branches implement lapdog: `feat/lapdog-thread-observability-dsv4pro` at `431c88ad` and `feat/lapdog-thread-observability-mmm3` at `1cf7cdca`, both based on master at `9772993a`. A prototype branch `feat/lapdog-prototype` at `b9ce8c6f` also exists. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1165b4ae001p5SDqfee8r9Naf)
- [2026-06-29 04:22] In both branches, cost span emission in `src/thread/runner.ts` is fire-and-forget — `void` after parse (dsv4pro line 73, mmm3 line 67). The CLI process can exit before the `/v0.4/traces` POST completes. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1166f7a8001Fl18fINn30SnZ6)
- [2026-06-29 04:22] In dsv4pro, `src/thread/cost-span.ts:107-109` hardcodes cost metrics to zero — the dashboard would show tokens but no cost, violating the requirement to emit integer nanodollar cost from parsed usage. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:22] In dsv4pro, `src/thread/cost-span.ts:25-26,145-151` passes 64-bit random IDs into JS `number`, risking precision loss past 2^53. At lines 32, 42, and 47 the payload is hardcoded as Claude even for OpenCode runs — OpenCode spans are mislabeled, weakening harness-symmetric design. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:22] In mmm3, `src/thread/cost-span.ts:154-167` assigns all cost to output in a fake split — acceptable if lapdog only needs the total, but the invented split should not be hidden in code without spec acknowledgement. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:22] Both branches use `ghcr.io/datadog/dd-apm-test-agent/ddapm-test-agent:latest` — the `latest` tag is not pinned, so local dashboard behavior is non-reproducible. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:22] In mmm3, `src/thread/build.ts:26-32` makes the thread image build hash depend on `opencode/plugins/lapdog.ts`, coupling thread-runtime image assembly to the repo's OpenCode plugin catalog. The plugin is an internal baked runtime asset but lives under the user-facing plugin catalog — a boundary leak. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:23] The OpenCode plugin lifecycle hook input is `{ event: Event }` only — session ID must come from the event payload itself, not from a broad `"sessionID" in input.event` guess. Both branches need event-shape-specific handling and tests against real OpenCode event samples. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f11686cea001VkozMWDhfuHlkU)
- [2026-06-29 04:23] In dsv4pro, `src/thread/opencode-lapdog-plugin.ts:78-96` only handles `session.started` and `session.ended` — missing Stop and other accepted lapdog lifecycle events. At lines 28-34, `PreToolUse` drops `tool_input`, violating the mapping requirement to carry tool args. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:23] In mmm3, `opencode/plugins/lapdog.ts:105-153` has a more complete event switch than dsv4pro, but event names and session IDs need validation against actual OpenCode events. At lines 142-150, mapping unknown `subagent.*` events to `Notification` is a design smell — best-effort broad forwarding creates noisy magical behavior; either skip or map only proven events. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:23] In dsv4pro, `src/thread/runner.test.ts` adds a "lapdog probe behavior" test that only re-exercises parsing — it does not actually test probe behavior or docker arg injection. The core chokepoint in `DockerAgentRunner.run` is unprotected. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:23] In mmm3, tests cover more intended behavior but do not exercise `DockerAgentRunner.run` end-to-end enough to catch the unawaited cost emission. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:24] mmm3 creates a second parallel OpenSpec change directory (`lapdog-thread-observability-mmm3`) instead of updating the existing canonical one — process clutter. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)

## Issues

- [2026-06-29 04:22] **Blocker — both branches:** Cost span emission in `DockerAgentRunner.run` is fire-and-forget (`void` after parse). The CLI process can exit before the `/v0.4/traces` POST completes, making cost observability flaky. `emitCostSpan` already swallows errors and has a timeout — should be awaited directly after parsing. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1166f7a8001Fl18fINn30SnZ6)
- [2026-06-29 04:22] **Blocker — both branches:** Unpinned `ddapm-test-agent:latest` image — the spec requires pinning the image reference or tag for reproducible local dashboard behavior. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:23] **Blocker — both branches:** OpenCode event mapping guesses at session ID shape using a broad `"sessionID" in input.event` check — needs event-shape-specific tests against real OpenCode event samples. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f11686cea001VkozMWDhfuHlkU)
- [2026-06-29 04:22] **mmm3 structural:** Thread image build hash depends on `opencode/plugins/lapdog.ts` in the user-facing OpenCode plugin catalog, coupling thread-runtime image assembly to the plugin catalog. Recommended move: `src/thread/opencode-lapdog-plugin.ts` or `src/thread/assets/opencode-lapdog-plugin.ts`, then hash/copy into the tools image. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:24] **mmm3 process:** Duplicate OpenSpec change directory instead of updating the existing canonical one, creating process clutter. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)
- [2026-06-29 04:23] **Neither branch:** No end-to-end test for `DockerAgentRunner.run` exercises docker args and cost emission sequencing. (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f1168c8dc001V25UdDMAP1fG7p)

## Intent & Vision

- [2026-06-29 04:21] "there are two feature branches that implemented a lapdog feature based on a .md in repo and the prototype branch. I want you to look at both and do a thermo nuclear code review of each and then give a ranking of what the better branch would be after the review changes." (ses_0ee9a898affeZLxl2ZX93omXfS · prt_f11656f4a001uExEIkECb27lQU)

## Sources

- `/home/mark/code/mindframe-z/docs/handoff-lapdog-threads-observability.md`
- `/home/mark/code/mindframe-z/openspec/changes/lapdog-thread-observability/design.md`
- `/home/mark/code/mindframe-z/openspec/changes/lapdog-thread-observability/tasks.md`
- `/home/mark/code/mindframe-z/openspec/changes/lapdog-thread-observability/specs/thread-observe-capture/spec.md`
