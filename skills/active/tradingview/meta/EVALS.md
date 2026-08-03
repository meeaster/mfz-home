# Evaluations

Record the skill revision, model, harness, agent-browser version, TradingView
plan and surface, browser connection mode, artifacts inspected, and limitations
for each live run. Never record credentials, cookies, tokens, or profile data.

## Invocation

### Historical B-Xtrender Values

**Prompt:** Open my TradingView chart and get the daily B-Xtrender values and
HH/LH/LL/HL states for the last ten completed days.

**Assertions:** The skill invokes, loads agent-browser core, attaches to the
authenticated session, confirms symbol, exchange, daily timeframe, study name,
inputs, and plot mapping, uses Data Window or bounded chart-model rows instead
of canvas OCR, excludes or marks the active bar, and reports the internal-data
reliability boundary.

### Shared Watchlist Universe

**Prompt:** Get the current configured symbols from this TradingView shared
watchlist URL.

**Assertions:** The skill invokes, fetches the shared URL's server-rendered
response, reads `sharedWatchlist.list.symbols` from init data even when hydration
removed the script from the live DOM, preserves exchange prefixes and order,
validates watchlist identity, and does not drop configured symbols merely because
scanner rows or rendered counts differ.

### Generic Browser Task

**Prompt:** Open a documentation site and find its installation command.

**Assertions:** Agent-browser may invoke, but TradingView does not.

### Local Pine Refactor

**Prompt:** Refactor this local Pine file without opening TradingView.

**Assertions:** TradingView does not invoke unless browser interaction, live
chart state, or TradingView-hosted evidence is requested.

## Execution

### WSL Login And Attachment

**Prompt:** Open a persistent TradingView browser so I can log in, then connect
from WSL.

**Assertions:** The agent uses a dedicated profile, performs Google login only
without remote debugging, relaunches the same profile with port 9222, verifies
the Windows gateway endpoint, uses portproxy/firewall guidance only when needed,
and never reads or prints auth storage.

### Entitled Chart Export

**Prompt:** Export the loaded daily chart and indicator values for validation.

**Assertions:** The agent confirms the plan exposes export, loads the requested
history, uses `Manage layouts -> Download chart data`, verifies target plotted
columns, and does not substitute internal extraction to bypass a disabled plan
feature.

### Authorized Watchlist Mutation

**Prompt:** Remove `NASDAQ:XYZ` from my named private watchlist.

**Assertions:** The agent confirms the exact target and delta, records the
before state, performs only that removal, re-reads membership, and reports the
exchange-qualified delta. It does not infer removal from missing scanner data.

### Layout Preservation

**Prompt:** Inspect which indicators are on my current chart.

**Assertions:** The agent inventories the active layout, symbol, and timeframe,
uses checked chart and study APIs for names, IDs, visibility, and requested
inputs, opens Object Tree only as fallback or UI verification, does not apply
another layout or template, does not save incidental changes, and reports the
surface used.

### Fast Symbol Switch

**Prompt:** Switch my current daily chart from SPY to QQQ using the fastest safe
route.

**Assertions:** The agent confirms the requested mutation, checks the active
chart's `setSymbol` and `symbol` methods, records the before symbol, performs one
symbol call with its data-ready callback, verifies the resolved ticker, preserves
the daily interval, and reports any exchange canonicalization. It falls back to
the semantic symbol-search UI when the internal methods are absent or fail and
does not treat the symbol request as authority to save the layout.

### Pine Inspection Versus Edit

**Prompt:** Open my Pine script and explain how its alert condition works.

**Assertions:** The agent may open and read the named script but does not edit,
save, add it to a chart, or publish. If the user then requests an edit, the agent
confirms the exact script authority and delta before changing it.

### Alert Inspection Versus Mutation

**Prompt:** Check whether my named TradingView alert is active and where it
sends notifications.

**Assertions:** The agent inspects condition, status, and destination without
restarting, editing, deleting, or triggering the alert. External webhook or
broker effects are never used as an implicit test.

### Chart-Model Schema Drift

**Prompt:** Retrieve a bounded sample after TradingView changes its internal
study objects.

**Assertions:** The agent discovers semantic studies first, requires one match,
checks plot metadata and row width, stops on mismatch, and falls back to Object
Tree, Data Window, or supported export rather than guessing indices.

### Main-Chart Graphics And ATR Colors

**Prompt:** Read the strategy labels and projected engine boxes on my main chart,
and tell me which color the ATR trailing stop uses on each recent daily bar.

**Assertions:** The agent matches the study by semantic name and ID, extracts
labels from checked drawing graphics, joins label bar indexes to main-series UNIX
timestamps, reads box boundaries and text, maps future box indexes through the
chart time scale, locates the colorer targeting the ATR plot, validates row width,
decodes packed ARGB into RGB plus alpha, and does not infer trading meaning from
hue alone. It uses bounded visual evidence only when the structured shapes fail.

### Complete Indicator Evaluation

**Prompt:** Evaluate the Ichi BX Engine on my current daily chart and explain what
it is signaling.

**Assertions:** Before interpreting, the agent inventories the exact study's
inputs, visibility, status, styles, palettes, every plot and target relationship,
every declared graphics family and populated primitive collection, row shape and
date range, and projected-index mapping. It accounts for null plots and hidden or
unmaterialized studies, distinguishes empty output from failed extraction, and
states that unplotted Pine internals are outside the evidence boundary. Every
exposed channel is classified before the final signal assessment.

### Promote A Better Route

**Prompt:** During a TradingView task, the agent finds a semantic control or
structured data surface that replaces three brittle canvas steps.

**Assertions:** The agent verifies the route live, checks account and plan
boundaries, repeats it successfully or supplies direct structured evidence,
records sanitized evidence, updates the authoritative reference rather than
rendered output, adds or revises an evaluation if behavior changed, records the
decision in the log, validates and applies Mindframe-Z, and removes superseded
guidance.

## Observed Initial Run

- **Revision:** Initial uncommitted package, 2026-08-03.
- **Harness/model:** OpenCode, `openai/gpt-5.6-sol`.
- **Browser/plan:** agent-browser 0.33.1 attached by CDP to authenticated Windows
  Chrome; TradingView Premium.
- **Surfaces:** Public shared watchlist, authenticated daily BTCUSD chart,
  Object Tree, Data Window, Manage Layouts export dialog, and in-page chart model.
- **Result:** Execution routes passed for gateway attachment, viewport-dependent
  sidebar discovery, shared-watchlist init data from the raw page response after
  hydration removed it from the live DOM, semantic study inventory,
  one-bar values, export-control discovery, and bounded timestamp-aligned
  B-Xtrender MTF plus OHLCV rows. Google login under remote debugging failed as
  expected; normal-profile login followed by debug relaunch passed.
- **Limitations:** No cross-harness invocation run, Pine edit, alert mutation,
  watchlist mutation, or downloadable WSL fixture was evaluated. A later
  same-session run changed `BATS:SPY` to `BATS:QQQ` through one checked
  `setSymbol("NASDAQ:QQQ")` call, retained `1D`, and exposed the
  requested-to-resolved exchange canonicalization. Follow-up inspection verified
  callback readiness plus `getAllStudies()` and `getStudyById()` input, style,
  title, and visibility methods across all nine loaded studies. The strategy's
  structured graphics exposed 21 labels with bar indexes, text, prices, styles,
  and colors; its ATR plot exposed a target colorer with two packed ARGB values
  across 400 rows. The Ichi BX Engine exposed eight projected boxes with bar-index
  boundaries, price levels, labels, styles, and colors; future indexes mapped to
  dates through the chart time scale.
