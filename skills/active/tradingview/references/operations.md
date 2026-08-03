# TradingView Operations

Use these routes for TradingView branches that change durable chart or account
state. A request to inspect does not authorize a mutation.

## Layouts

Read the active layout name, symbol, timeframe, and save state before opening
`Manage layouts`. Opening or switching a layout can replace the entire chart
surface; saving, renaming, copying, sharing, or creating a layout is a mutation.
Use an authorized copy for experiments. After temporary symbol or timeframe
work, restore and verify the original state unless the user requested the new
state to persist.

## Symbols

For an authorized symbol change on the active chart, the fastest observed route
uses TradingView's in-page chart object. This is undocumented, so check the live
shape and retain the semantic UI fallback:

```bash
agent-browser --cdp "<cdp-url>" eval --stdin <<'JS'
```

```javascript
(async () => {
  const requested = "NASDAQ:QQQ";
  const ticker = requested.split(":").at(-1);
  const chart = window.TradingViewApi?.activeChart?.();
  if (typeof chart?.setSymbol !== "function" ||
      typeof chart?.symbol !== "function") {
    throw new Error("TradingView symbol methods are unavailable");
  }

  const before = chart.symbol();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("TradingView symbol change timed out")),
      10_000,
    );
    chart.setSymbol(requested, () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  const after = chart.symbol();
  if (after?.split(":").at(-1) !== ticker) {
    throw new Error(`TradingView did not switch to ${ticker}; current symbol is ${after}`);
  }
  return { requested, before, after, interval: chart.resolution?.() };
})()
```

```bash
JS
```

Report the resolved exchange because TradingView may canonicalize the requested
identifier to the account's active feed. When exact exchange selection matters,
or when the methods are absent or fail, click the current-symbol button, fill the
exchange-qualified symbol in `Symbol, ISIN, or CUSIP`, press Enter, and verify the
chart header or Data Window. Neither route authorizes saving the layout.

## Indicators And Settings

Use checked study inventory and input APIs to identify the exact study and
current values; use Object Tree to confirm UI-visible settings before changing
them. Changing inputs, style, visibility, order, pane, or scale can autosave.
Record the intended field-level delta, perform only that delta, and verify the
study API plus Object Tree or Data Window after the change.

## Pine Editor

Opening Pine for inspection is read-only. Editing, saving, adding to chart,
updating an existing script, publishing, or changing visibility requires
explicit authority. Before an edit, identify the exact script and whether it is
private, shared, or published. Preserve the prior source in its authoritative
repository or an authorized copy, compile the changed script, and verify the
intended plots or alerts without publishing unless requested.

## Alerts

Use the Alerts sidebar to inspect names, symbols, conditions, status, expiration,
and notification destinations. Creating, editing, restarting, stopping, cloning,
or deleting an alert is a mutation. Preview the exact condition and destination
before confirmation. Do not trigger a webhook, broker route, email, or other
external effect as a test unless that effect is explicitly authorized.

## Unrecorded Operations

Start with a fresh interactive snapshot and semantic controls. Re-snapshot after
every dialog or page change. If a verified selector or structured state removes
material retries, follow the field-guide improvement step after the user operation
is complete; never experiment with skill maintenance while a live financial
mutation is pending.
