---
name: tradingview
description: >
  TradingView browser operations. Use when interacting with TradingView charts,
  layouts, indicators, the Data Window, Pine editor, alerts, shared or private
  watchlists, chart-data exports, or loaded study values through agent-browser.
---

# TradingView

This is a TradingView field guide layered on `agent-browser`. Load the
`agent-browser` skill and run `agent-browser skills get core` before issuing
browser commands; this skill owns TradingView routes, not browser mechanics.

## Workflow

1. Establish authority and choose the branch.

   Default to inspection. Treat opening panels and reading loaded data as
   inspection; symbol, timeframe, and layout changes may autosave and require a
   user-requested target plus restoration or an authorized disposable surface.
   Require explicit user authority before saving layouts, changing indicator
   settings, editing Pine, creating or changing alerts, modifying watchlists,
   publishing, or trading. Open
   [browser setup](references/browser-setup.md) for login or WSL attachment,
   [watchlists](references/watchlists.md) for universe work, and
   [charts and data](references/charts-and-data.md) for chart or study values.
   Use [TradingView operations](references/operations.md) for layouts,
   indicators, Pine, and alerts.
   Done when the target account, layout, symbol, timeframe, requested operation,
   and mutation boundary are explicit.

2. Attach without disturbing the chart.

   Prefer an existing authenticated Chrome session for private data and an
   isolated session for public pages. Record the active layout, symbol,
   exchange, timeframe, and visible studies before acting. Resize a narrow
   viewport before concluding that a sidebar control is absent. Done when a
   fresh snapshot confirms the expected TradingView surface and account state.

3. Use the shortest evidence surface.

   | Need | Preferred surface |
   | --- | --- |
   | Configured symbols in a shared watchlist | Server-rendered `sharedWatchlist.list.symbols` |
   | Chart context and study inventory | `TradingViewApi` chart and study methods |
   | Evaluate an indicator | Complete exposed-output inventory before interpretation |
   | UI-visible study settings | Object Tree fallback or verification |
   | Values at one bar | Data Window |
   | Study labels and per-bar plot colors | Study graphics and colorer rows |
   | Loaded historical study values | Chart model after verifying the live shape |
   | Validated chart mutation | Checked `TradingViewApi` method, then semantic UI fallback |
   | Supported bulk chart export | `Manage layouts -> Download chart data` |
   | An unrecorded operation | Snapshot/ref loop, then promote a better verified route |

   Prefer feature-detected in-page APIs and structured page state when a verified
   recipe owns the operation; otherwise use semantic controls. Use canvas OCR,
   repeated hovering, rendered-table scraping, and remembered selectors only as
   diagnostics. Done when the requested evidence or action is obtained through
   the narrowest reliable surface.

   Indicator evaluation is exhaustive within the loaded chart surface. Account
   for every exposed input, plot, target colorer, style, palette, graphics family,
   primitive collection, visibility state, and row-availability state. Classify
   each as analyzed, absent, hidden, unsupported, or irrelevant to the question.
   Done only when every declared output channel is accounted for and unexposed
   Pine internals are identified as outside the evidence boundary.

4. Validate the result in TradingView terms.

   Report the symbol with exchange, timeframe, study name and inputs, loaded
   date range, whether the latest bar is active or confirmed, and whether the
   result came from UI text, supported export, or undocumented in-page state.
   For mutations, re-read the affected surface and state exactly what changed.
   Done when another run could reproduce the result without inferring hidden
   chart state.

5. Improve the field guide.

   This package carries standing human authority to promote validated
   TradingView automation improvements. Compare the successful route with this
   package and require either two successful repetitions or one success plus
   direct structured evidence. Promote only when it removes meaningful retries
   or ambiguity, generalizes beyond one click, preserves account and plan
   boundaries, and has a verification and fallback. Record sanitized evidence
   before editing. When the authoritative Personal Mindframe-Z home is writable
   and its repository state permits the change, update the single owning
   reference, affected evaluations, and `meta/LOG.md`, run focused validation,
   then apply the home. When only rendered output is available, report the
   candidate and reproduction evidence instead. Replace superseded guidance.
   Done when a material reusable discovery passes the promotion gate or is
   handed off explicitly.

## Guardrails

- Keep credentials, cookies, auth tokens, Chrome profiles, and private account
  data out of commands, logs, screenshots, fixtures, and skill files.
- Use Google or other identity-provider login in a normal browser launch, then
  relaunch the same dedicated profile with remote debugging.
- Preserve the user's active layout. Do not switch layouts, apply templates, or
  save incidental panel and chart changes without authority.
- Treat symbol and timeframe changes as potentially persistent. Use a copy or
  restore the original state and verify it when the requested inspection needs a
  different chart context.
- Treat broker and order controls as live financial actions. Inspection does not
  authorize placement, cancellation, or account changes.
- Respect plan entitlements. Internal chart inspection may read bounded values
  already loaded and visible to the account; it must not request extra history
  or produce a bulk-export substitute when chart export is disabled.
- Keep reverse engineering inside the loaded browser surface. Do not extract
  credentials or session material, automate private backend protocols, or turn
  undocumented endpoints into a separate TradingView client.
- Treat TradingView internals as version-sensitive. Discover studies by semantic
  name, feature-detect methods, verify every mutation, inspect plot metadata and
  row shape, and retain a semantic UI fallback.
