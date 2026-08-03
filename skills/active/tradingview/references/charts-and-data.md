# Charts And Data

## Inventory Before Extraction

Confirm the active layout, exchange-qualified symbol, interval, and loaded
studies before reading values. The fastest observed inventory route uses checked
chart APIs:

```bash
agent-browser --cdp "<cdp-url>" eval --stdin <<'JS'
```

```javascript
(() => {
  const api = window.TradingViewApi;
  const chart = api?.activeChart?.();
  const studies = chart?.getAllStudies?.();
  if (!api || !chart || !Array.isArray(studies)) {
    throw new Error("TradingView chart inventory APIs are unavailable");
  }
  return {
    layout: api.layoutName?.(),
    symbol: chart.symbol?.(),
    interval: String(chart.resolution?.()),
    chartType: chart.chartType?.(),
    studies: studies.map(({ id, name }) => ({ id, name })),
  };
})()
```

```bash
JS
```

For one study's inputs, find exactly one semantic name match and inspect its
checked study API. Return only requested inputs when the full list would be
large:

```javascript
(() => {
  const requested = "B-Xtrender MTF";
  const chart = window.TradingViewApi?.activeChart?.();
  const matches = chart?.getAllStudies?.()
    ?.filter(({ name }) => name === requested) ?? [];
  if (matches.length !== 1 || typeof chart?.getStudyById !== "function") {
    throw new Error(`Expected one study named ${requested}; found ${matches.length}`);
  }

  const study = chart.getStudyById(matches[0].id);
  const values = study?.getInputValues?.();
  const info = study?.getInputsInfo?.();
  if (!Array.isArray(values) || !Array.isArray(info) || values.length !== info.length) {
    throw new Error("TradingView study input shape changed");
  }
  const metadata = new Map(info.map((input) => [input.id, input]));
  return {
    id: matches[0].id,
    name: matches[0].name,
    title: study.title?.(),
    visible: study.isVisible?.(),
    inputs: values.map(({ id, value }) => ({
      id,
      name: metadata.get(id)?.name,
      hidden: metadata.get(id)?.isHidden,
      value,
    })),
  };
})()
```

Use Object Tree when these methods are absent, when UI-visible settings must be
confirmed, or as a spot-check after schema drift. The Data Window remains the
preferred surface for values at one selected bar.

At narrow widths, resize before searching for the sidebar. Prefer the semantic
button label `Object tree and data window` and the `Data window` tab over visual
coordinates.

## Indicator Surface Inventory

Before interpreting an indicator, inventory its complete exposed surface. Start
from the semantic study ID and account for:

- inputs from `getInputsInfo()` joined by ID to `getInputValues()`;
- current visibility, title, status, style metadata, and style values;
- every `metaInfo().plots` entry, including lines, shapes, bar or background
  colorers, target colorers, palettes, fills, and plots whose rows are null;
- every declared `metaInfo().graphics` family and its live collection under
  `source.graphics()`, including labels, boxes, lines, polylines, tables, table
  cells, logs, text marks, shape marks, and other populated primitives;
- row count, row width, loaded date range, and whether hidden studies have zero
  materialized rows;
- every bar-index field that must be joined to main-series rows or converted with
  `timeScale().indexToTimePoint()`.

Begin interpretation only after each declared plot and graphics family is marked
as populated, empty, hidden, unavailable, or irrelevant to the requested claim.
An authorized temporary visibility change may materialize a hidden study; restore
and verify its prior state afterward. Keep unplotted Pine variables outside the
evidence claim unless another verified surface exposes them.

## One Bar

Open the Data Window, move the crosshair to the target bar, and read the symbol
row plus the target study row. Record the date, symbol, timeframe, study inputs,
and whether the selected bar is active. Use this route for spot checks, not a
historical series.

## Labels And Dynamic Plot Colors

Read Pine-generated chart labels and dynamic plot colors from the target study's
structured model before considering canvas OCR. Match the study semantically with
`getAllStudies()`, then match its model source by the same ID.

For drawing labels, feature-detect `source.graphics().dwglabels()`. The observed
label collection was nested by graphic name and pane flag, and its values exposed
`x`, `y`, `text`, `style`, `colorIndex`, and `textColorIndex`. Label `x` was a
main-series bar index, not a timestamp. Join it to
`model.mainSeries().data().bars()._items` by `row.index`; the corresponding UNIX
timestamp is `row.value[0]`.

For projected boxes, feature-detect `source.graphics().dwgboxes()`. The observed
box values exposed `left`, `right`, `top`, `bottom`, `text`, border properties,
and packed background, border, and text colors. Convert current or future bar
indexes with `model.timeScale().indexToTimePoint(index)` rather than assuming a
weekday calendar.

For a dynamically colored plot, inspect `source.metaInfo().plots`, locate the
`colorer` whose `target` is the requested plot, validate every row width, and
read its row column at the colorer's metadata index plus one. Observed color
values were packed ARGB integers:

```javascript
const packed = colorValue >>> 0;
const alpha = (packed >>> 24) & 255;
const rgb = `#${(packed & 0x00ffffff).toString(16).padStart(6, "0")}`;
```

Report RGB and alpha per bar. Assign trading meaning to a color only when the
source formula or live behavior verifies it. If graphics or colorer shapes differ,
fall back to a bounded screenshot and label the result as visual evidence.

## Supported Export

When the current plan enables chart-data export:

1. Load the required history by scrolling the chart left or expanding its date
   range.
2. Open `Manage layouts -> Download chart data`.
3. Select the intended chart and timestamp format.
4. Verify that the CSV contains the target plotted series.

Export includes loaded plotted indicator values, not arbitrary internal Pine
variables. Add an explicitly authorized validation plot when a needed value is
not exposed. Agent-browser may automate an entitled download; it must not use
another route to defeat a disabled export control.

## Loaded Study Rows

For bounded debugging or parity fixtures under an account whose current surface
already displays the target study values, the page may expose those loaded rows
through its in-page chart model. This is undocumented and version-sensitive.
Inspect the live shape every run; never assume a source index, generated ID,
plot count, or property name. Do not request more history through this route or
use it to reproduce a disabled bulk export.

First list studies semantically:

```bash
agent-browser --cdp "<cdp-url>" eval --stdin <<'JS'
```

```javascript
(() => {
  const chart = window.TradingViewApi?.activeChart?.();
  const model = chart?.chartModel?.();
  if (!model) throw new Error("Active TradingView chart model is unavailable");

  const safeCall = (target, method) =>
    typeof target?.[method] === "function" ? target[method]() : undefined;

  return model.dataSources()
    .map((source) => ({
      id: safeCall(source, "id") ?? source._id,
      name: safeCall(source, "name"),
      title: safeCall(source, "title"),
    }))
    .filter((source) => source.name || source.title);
})()
```

```bash
JS
```

Then inspect the chosen study's plot metadata and a bounded row sample:

```bash
agent-browser --cdp "<cdp-url>" eval --stdin <<'JS'
```

```javascript
(() => {
  const studyName = "B-Xtrender MTF";
  const chart = window.TradingViewApi?.activeChart?.();
  const model = chart?.chartModel?.();
  if (!model) throw new Error("Active TradingView chart model is unavailable");

  const safeCall = (target, method) =>
    typeof target?.[method] === "function" ? target[method]() : undefined;
  const matches = model.dataSources().filter((candidate) => {
    try {
      return safeCall(candidate, "name") === studyName;
    } catch {
      return false;
    }
  });
  if (matches.length !== 1) {
    return {
      error: `Expected one study named ${studyName}; found ${matches.length}`,
      candidates: model.dataSources()
        .map((candidate) => safeCall(candidate, "title"))
        .filter(Boolean),
    };
  }

  const source = matches[0];
  const plots = safeCall(source, "metaInfo")?.plots;
  const rows = safeCall(source, "data")?._items;
  if (!Array.isArray(plots) || !Array.isArray(rows)) {
    throw new Error("TradingView study shape changed; inspect before continuing");
  }
  const malformed = rows.find(
    (row) => !Array.isArray(row?.value) || row.value.length !== plots.length + 1,
  );
  if (malformed) {
    throw new Error("TradingView row width no longer matches plot metadata");
  }

  return {
    study: safeCall(source, "title") ?? studyName,
    plots: plots.map(({ id, type, target, palette }, index) => ({
      index,
      id,
      type,
      target,
      palette,
    })),
    rowCount: rows.length,
    sample: rows.slice(-10).map(({ index, value }) => ({ index, value })),
  };
})()
```

```bash
JS
```

In the observed PlotList-backed B-Xtrender study, `value[0]` was UNIX time and
the remaining values followed plot metadata order. Confirm timestamp shape and
plot titles against the Data Window before assigning meaning to columns. A
verified `B-Xtrender MTF` configuration used line plots at `plot_0`, `plot_2`,
and `plot_4` for daily, weekly, and monthly values; intervening plots were
colorers. Re-check this mapping on every run.

The main OHLCV rows may be available at
`model.mainSeries().data().bars()._items`. Join study and price rows by UNIX
timestamp, not array index. Bound samples before returning full rows.

## B-Xtrender State

After confirming the numeric series and source formula, derive the four states
from the current and previous values:

```javascript
const state = current > 0
  ? (current > previous ? "HH" : "LH")
  : (current < previous ? "LL" : "HL");
```

Mark the latest row as active until the symbol's session and timeframe confirm
it is complete. Never use an updating row as a parity fixture or next-session
signal.

## Reliability Boundary

Use chart-model extraction only for a bounded sample of values already loaded
and visible on the chart. Keep production market data and strategy execution
independent of this internal interface. When supported export is disabled, stop
before turning the bounded inspection into a historical export. If the internal
shape changes, return to Object Tree, Data Window, and supported export before
updating this reference from new live evidence.
