# Browser setup

Load `browser-control` and follow the shared browser instructions. Use a new session-owned page for public TradingView pages. When the task needs a private watchlist, saved layout, or Pine script, attach and adopt the intended authenticated tab through Browser Control. A separate session owns its page but shares the relay's browser profile; it is not an isolated account.

## Choose and verify the tab

Create a distinct session for the task and pass its ID on later calls. For an existing user tab, ask the human to attach it with the Browser Control toolbar button and adopt that exact target. Verify the URL, intended account, chart layout, symbol, and timeframe before proceeding. Report unavailable attachment or capability rather than switching browser tools or opening remote-debugging ports.

The human handles login, security keys, and other authentication prompts through the browser workflow's handoff. Verify the destination after completion. Keep authentication storage and browser profiles outside inspection or copies.

## Run page recipes in the correct runtime

The reference recipes use `page.evaluate` inside Browser Control's `execute` runtime. They can run through its MCP execute tool or a local script passed to `browser-control execute --session <id> --file <path>`. Browser Control supplies `page`; ordinary shell JavaScript or the outer tool-orchestration runtime does not.

The function passed to `page.evaluate` runs in the TradingView page, where `window.TradingViewApi` and the page DOM exist. Return only the requested bounded result. Snapshot, locator actions, and browser helpers run outside that page function, within Browser Control's runtime.

## Make controls visible and finish cleanly

TradingView hides some sidebar and legend controls in a narrow viewport. Adjust only the task page's viewport before concluding a control is absent. Take a fresh snapshot after menus, dialogs, layouts, symbols, or sidebars change; old element references may be stale.

Preserve and restore chart state as required by the assignment. At completion, delete the task's Browser Control session unless follow-up needs it. Session deletion releases an adopted user tab without closing it; keep ownership explicit.
