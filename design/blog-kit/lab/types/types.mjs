// Nine Mermaid types under one colour system. Each diagram declares only
// intent (groups, one focal element, status); the CSS below turns intent into colour.
import { readFile, writeFile } from 'node:fs/promises';
import { fixAll } from '../pele-post.mjs';
const dir = new URL('.', import.meta.url).pathname;

const diagrams = [
  ['flow', 'Flowchart', 'Architecture with three groups and a focal box. The path that is deliberately not used is neutral and dashed, not red: it is not a risk.',
    { groups: { z1: 'cyan', z2: 'purple', z3: 'yellow' }, focal: 'opw', unused: ['arch', 'L_opw_arch_0'] }],
  ['seq', 'Sequence', 'The par block is a group; the note is a margin note; the Worker is focal.',
    { frames: 'cyan', focal: 'W', note: true }],
  ['state', 'State', 'The composite state is a group; Degraded uses status orange because it literally is a warning state.',
    { composite: 'cyan', status: { Degraded: 'orange' } }],
  ['er', 'Entity relationship', 'Entities are neutral; one focal entity.', { focal: 'PIPELINE' }],
  ['git', 'Git graph', 'Branches are groups: main stays neutral, feature branches take grouping hues in order. Labels are outlined pills.', { series: ['muted', 'cyan', 'purple'], pills: { main: 'muted', 'opw-prototype': 'cyan', pipeline: 'purple' } }],
  ['timeline', 'Timeline', 'Periods are ordered steps, not groups, so they stay neutral; the step the text is about is focal.', { timeline: 'Watchtower' }],
  ['arch', 'Architecture', 'Groups as loops, services neutral, one focal service.', { groups: { vpc: 'cyan', eks: 'purple' }, focal: 'opw' }],
  ['xy', 'Bar chart', 'Bars are neutral; the one bar the text talks about is focal.', { bars: 4 }],
  ['mind', 'Mindmap', 'Neutral, with one focal branch: a mindmap is a breakdown, not a set of containers.', { mindFocal: 2 }],
  ['vocab', 'Vocabulary', 'Every shape and line once, each line showing its own meaning. No single subject, so no colour.', {}],
];

// Outside labels are written lowercase in the Mermaid source (literals keep their case); no CSS lowercasing.
const outside = `font-family: Kalam, "Segoe Print", cursive;`;
const base = `
  .fig { border-radius: 10px; padding: 14px; background-color: var(--bg);
    background-image: radial-gradient(color-mix(in srgb, var(--muted) 32%, transparent) 1px, transparent 1.3px); background-size: 24px 24px; }
  .fig.plain { background-image: none; }
  .fig svg { --pele-radius: 10px; }
  .fig .pele-node :is(rect, polygon, path, circle, ellipse):not(.pele-icon *) { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }
  .fig .pele-subtitled .pele-label tspan:first-child { font-weight: 700; }
  .fig .pele-subtitled .pele-label tspan:nth-child(2) { font-size: 12px; fill: var(--muted); }
  .fig .pele-edges { stroke: var(--line); } .fig .pele-marker { fill: var(--line); }
  .fig .pele-edge-label text, .fig .pele-cluster-label, .fig .pele-frame-label { ${outside} font-size: 17px; }
  .fig .pele-edge-label rect { fill: var(--bg); }
  .fig .pele-cluster rect { fill: none; stroke: var(--neutral); stroke-width: 2; rx: 28px; filter: url(#lasso); }
  .fig .pele-bars rect { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }
  .fig .pele-annotation { font-family: Kalam, "Segoe Print", cursive; font-size: 17px; fill: var(--muted); }
  .fig .pele-annotation-line { stroke: var(--muted); stroke-width: 1.4; }
  .fig .pele-annotation-emphasis { fill: var(--pink); } .fig .pele-annotation-emphasis-line { stroke: var(--pink); }
  .fig text.pele-literal { font-family: "Segoe UI", Arial, sans-serif; font-size: 15px; }
  .fig .pele-state-composite > path { display: none; } /* a group is its loop and label; no title rule */
  .fig .pele-state-start circle, .fig .pele-state-end circle { fill: var(--muted); stroke: none; }
  .fig .pele-lifeline { stroke: var(--neutral); }`;

const rules = ([id, , , o]) => {
  const s = `.${id}`;
  const out = [];
  for (const [g, h] of Object.entries(o.groups ?? {})) out.push(`${s} [data-id=${g}] > rect { stroke: var(--${h}); } ${s} [data-id=${g}] .pele-cluster-label { fill: var(--${h}); }`);
  if (o.focal) out.push(`${s} [data-id="${o.focal}"] :is(rect, polygon, path, circle):not(.pele-icon *, .pele-icon-tile) { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
    ${s} [data-id="${o.focal}"] .pele-label tspan:first-child, ${s} [data-id="${o.focal}"] .pele-label { fill: var(--pink); }
    ${s} .pele-activation[data-id="${o.focal}"] { fill: var(--pink); stroke: none; }`);
  for (const [k, h] of Object.entries(o.status ?? {})) out.push(`${s} [data-id="${k}"] :is(rect, polygon, path, circle) { stroke: var(--${h}); }
    ${s} [data-id="${k}"] .pele-label tspan:first-child, ${s} [data-id="${k}"] .pele-label { fill: var(--${h}); stroke: none; font-weight: 700; } ${s} [data-id="${k}"] { stroke: var(--${h}); } ${s} [data-id="${k}"] .pele-marker { fill: var(--${h}); }`);
  if (o.frames) out.push(`${s} .pele-frame rect:first-child { stroke: var(--${o.frames}); stroke-width: 2; rx: 22px; filter: url(#lasso); }
    ${s} .pele-frame rect:nth-child(2) { fill: none; stroke: none; } ${s} .pele-frame-kind { fill: var(--${o.frames}); ${outside} font-size: 15px; }`);
  if (o.note) out.push(`${s} .pele-note rect { fill: var(--bg); stroke: none; } ${s} .pele-note text { fill: var(--pink); font-style: italic; font-family: "Palatino Linotype", Georgia, serif; font-size: 15px; }`);
  if (o.composite) out.push(`${s} .pele-state-composite > rect { stroke: var(--${o.composite}); } ${s} .pele-state-composite .pele-cluster-label { fill: var(--${o.composite}); }`);
  if (o.series) out.push(`${s} svg { ${o.series.map((h, i) => `--pele-series-${i + 1}: var(--${h});`).join(' ')} }`);
  if (o.timeline) out.push(`${s} .pele-period rect, ${s} .pele-event rect { fill: var(--bg) !important; fill-opacity: 1 !important; stroke: var(--neutral); stroke-width: 1.5; }
    ${s} .pele-period text, ${s} .pele-event text { fill: var(--fg) !important; } ${s} .pele-period text { font-weight: 700; }
    ${s} [data-id="${o.timeline}"] rect { stroke: var(--pink) !important; stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)) !important; }
    ${s} [data-id="${o.timeline}"] text { fill: var(--pink) !important; }
    ${s} .pele-dot { fill: var(--muted); } ${s} .pele-axis { stroke: var(--neutral); }`);
  if (o.bars) out.push(`${s} .pele-bars rect[data-id=bar-${o.bars}] { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }`);
  for (const k of o.unused ?? []) out.push(`${s} [data-id="${k}"] :is(rect, path) { stroke-dasharray: 5 4; } ${s} [data-id="${k}"] .pele-label tspan { fill: var(--muted) !important; } ${s} [data-id="${k}"] .pele-marker { fill: var(--muted); }`);
  for (const [b, h] of Object.entries(o.pills ?? {})) out.push(`${s} .pele-branch[data-id="${b}"] > rect { fill: var(--bg); stroke: var(--${h}); stroke-width: 1.6; } ${s} .pele-branch[data-id="${b}"] > text { fill: var(--${h}); font-weight: 700; }`);
  if (o.mindFocal != null) out.push(`${s} .pele-section-${o.mindFocal} > .pele-node > rect { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); } ${s} .pele-section-${o.mindFocal} > .pele-shape-branch .pele-label { fill: var(--pink); font-weight: 700; } ${s} .pele-section-${o.mindFocal} > .pele-edges { stroke: var(--pink); }`);
  return out.join('\n');
};

const svgs = {};
for (const [id] of diagrams) svgs[id] = await fixAll(await readFile(`${dir}${id}.svg`, 'utf8'), await readFile(`${dir}${id}.mmd`, 'utf8'));
const card = ([id, t, n], plain = false) => `<section class="card"><h3>${t}</h3><p>${n}</p><div class="fig ${id}${plain ? ' plain' : ''}" id="fig-${id}${plain ? '-plain' : ''}">${svgs[id]}</div></section>`;
await writeFile(dir + 'types.html', `<!doctype html><meta charset=utf-8><title>Diagram types</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=block">
<style>
:root { color-scheme: dark; --bg:#282a36; --surface:#21222c; --alt:#44475a; --fg:#f8f8f2; --muted:#a3a8c3; --line:#c6c8d8;
  --neutral: color-mix(in srgb, #a3a8c3 60%, #282a36); --gl: color-mix(in srgb, #a3a8c3 11%, transparent);
  --cyan:#8be9fd; --purple:#bd93f9; --pink:#ff79c6; --green:#50fa7b; --orange:#ffb86c; --yellow:#f1fa8c; --red:#ff5555; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 "Segoe UI",system-ui,sans-serif; }
main { max-width:1500px; margin:0 auto; padding:20px; display:grid; grid-template-columns: repeat(auto-fill, minmax(720px, 1fr)); gap:24px; align-items:start; }
h1 { grid-column: 1 / -1; margin: 0; font-size: 22px; } .lead { grid-column: 1/-1; margin: -14px 0 0; color: var(--muted); }
.card { border: 1px solid var(--alt); border-radius: 12px; padding: 14px; }
h3 { margin: 0 0 2px; font-size: 16px; } .card > p { margin: 0 0 10px; color: var(--muted); font-size: 13px; }
.fig svg { display:block; max-width:100%; height:auto; margin: 0 auto;
  --pele-bg:var(--bg); --pele-fg:var(--fg); --pele-muted:var(--muted); --pele-line:var(--line);
  --pele-surface:var(--surface); --pele-surface-alt:var(--alt); --pele-border:var(--neutral); --pele-accent:var(--pink);
  --pele-font: "Segoe UI", Arial, sans-serif; }
${base}
${diagrams.map(rules).join('\n')}
</style>
<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="lasso" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="1100"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter>
</defs></svg>
<main><h1>Nine diagram types, one colour system</h1><p class="lead">24px dots (default). Neutral boxes · grouping hues on loops, branches and periods only · one pink focal element · status colours only where literal.</p>
${diagrams.map((d) => card(d)).join('\n')}
${card(diagrams[0], true).replace('<h3>Flowchart', '<h3>Flowchart on plain paper')}
</main>
<script src="../pen.js"></script>`);
