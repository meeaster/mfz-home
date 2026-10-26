// Round 3: three directions x three variations, built on the feedback so far:
// outlined boxes, colour on edges not fills, lowercase handwritten outside labels,
// dot-grid paper, colour emphasis on the focal box, loose whiteboard outlines.
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
const flow = await readFile(dir + 'flow.svg', 'utf8');

const hue = { agent: 'cyan', nlb: 'cyan', opw: 'purple', dd: 'pink', s3: 'pink' };
const zone = { z1: 'cyan', z2: 'purple', z3: 'pink' };
const nodes = (rule) => Object.entries(hue).map(([id, h]) => rule(id, h)).join('\n');
const zones = (rule) => Object.entries(zone).map(([id, h]) => rule(id, h)).join('\n');
const base = `
  .X { border-radius: 10px; background-color: var(--bg);
    background-image: radial-gradient(color-mix(in srgb, var(--muted) 30%, transparent) 1px, transparent 1.3px); background-size: 16px 16px; }
  .X .pele-label tspan:first-child { font-weight: 700; }
  .X .pele-label tspan:nth-child(2) { font-size: 12px; fill: var(--muted); }
  ${zones((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
  .X .pele-cluster-label { font-family: Kalam, "Segoe Print", cursive; font-size: 20px; text-transform: lowercase; }`;
const focal = (extra = '') => `.X [data-id=opw] rect { stroke: var(--pink); stroke-width: 2.6; fill: color-mix(in srgb, var(--pink) 16%, var(--bg)); ${extra} }
  .X [data-id=opw] .pele-label tspan:first-child { fill: var(--pink); }`;
const outline = (w, fillPct) => nodes((id, h) => `.X [data-id=${id}] rect { stroke: var(--${h}); stroke-width: ${w}; fill: ${fillPct ? `color-mix(in srgb, var(--${h}) ${fillPct}%, var(--bg))` : 'var(--bg)'}; }`);

const directions = [
  ['A', 'Whiteboard ink', 'Every box drawn by hand in marker: loose outlines over crisp type. The closest to a whiteboard that still reads as finished.', {
    a1: ['Single marker', 'Loose outline in the zone colour, empty box, zones as dashed hand lines.', `
      .X { --pele-radius: 12px; }
      .X .pele-node rect, .X .pele-edge path, .X .pele-cluster rect { filter: url(#ink); }
      ${outline(2, 0)}
      .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .45; stroke-dasharray: 9 7; stroke-width: 1.6; }
      .X .pele-edges { stroke-width: 1.8; }
      ${focal()}`],
    a2: ['Double stroke', 'Each outline drawn twice, slightly off, the way a marker overlaps itself.', `
      .X { --pele-radius: 12px; }
      ${nodes((id, h) => `.X [data-id=${id}] rect { stroke: var(--${h}); stroke-width: 1.6; fill: var(--bg); filter: url(#ink) drop-shadow(2px 1.5px 0 color-mix(in srgb, var(--${h}) 55%, transparent)); }`)}
      .X .pele-edge path { filter: url(#ink); }
      .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .45; stroke-dasharray: 9 7; stroke-width: 1.6; filter: url(#ink); }
      .X .pele-edges { stroke-width: 1.8; }
      ${focal('filter: url(#ink) drop-shadow(2px 1.5px 0 color-mix(in srgb, var(--pink) 55%, transparent));')}`],
    a3: ['Marker + wash', 'Loose outline with a light wash of colour inside, like a filled-in sketch.', `
      .X { --pele-radius: 14px; }
      .X .pele-node rect, .X .pele-edge path, .X .pele-cluster rect { filter: url(#ink); }
      ${outline(2, 10)}
      .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .45; stroke-dasharray: 9 7; stroke-width: 1.6; }
      .X .pele-edges { stroke-width: 1.8; }
      ${focal('fill: color-mix(in srgb, var(--pink) 26%, var(--bg));')}`],
  }],
  ['B', 'Studio grid', 'Precise boxes on dot-grid paper; only the labels are handwritten. The most professional of the three; depth is the variable.', {
    b1: ['Flat', 'Crisp coloured outlines, no shadow.', `
      .X { --pele-radius: 10px; }
      ${outline(1.6, 0)}
      .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .4; stroke-dasharray: 2 6; stroke-width: 2; stroke-linecap: round; }
      ${focal()}`],
    b2: ['Sticker shadow', 'Adds a small solid offset shadow in a darker shade of each box colour.', `
      .X { --pele-radius: 10px; }
      ${nodes((id, h) => `.X [data-id=${id}] rect { stroke: var(--${h}); stroke-width: 1.6; fill: var(--bg); filter: drop-shadow(3px 3px 0 color-mix(in srgb, var(--${h}) 40%, #000)); }`)}
      .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .4; stroke-dasharray: 2 6; stroke-width: 2; stroke-linecap: round; }
      ${focal('filter: drop-shadow(3px 3px 0 color-mix(in srgb, var(--pink) 45%, #000));')}`],
    b3: ['Paper stack', 'One soft sheet of colour offset behind each box: depth without a hard edge.', `
      .X { --pele-radius: 10px; }
      ${nodes((id, h) => `.X [data-id=${id}] rect { stroke: var(--${h}); stroke-width: 1.6; fill: var(--surface); filter: drop-shadow(5px 5px 0 color-mix(in srgb, var(--${h}) 22%, var(--bg))); }`)}
      .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .4; stroke-dasharray: 2 6; stroke-width: 2; stroke-linecap: round; }
      ${focal('filter: drop-shadow(5px 5px 0 color-mix(in srgb, var(--pink) 30%, var(--bg)));')}`],
  }],
  ['C', 'Lasso', 'The boxes stay precise; the groups are drawn by hand. Each zone is a loose marker loop around its boxes, like grouping things on a whiteboard.', {
    c1: ['Loop', 'A loose loop in the zone colour, crisp boxes inside.', `
      .X { --pele-radius: 10px; }
      ${outline(1.5, 0)}
      ${zones((id, h) => `.X [data-id=${id}] rect { fill: none; stroke: var(--${h}); stroke-opacity: .8; stroke-width: 2; rx: 28px; filter: url(#lasso); }`)}
      ${focal()}`],
    c2: ['Loop + circle', 'Loops for the zones, and the focal box circled by hand as well.', `
      .X { --pele-radius: 10px; }
      ${outline(1.5, 0)}
      ${zones((id, h) => `.X [data-id=${id}] rect { fill: none; stroke: var(--${h}); stroke-opacity: .8; stroke-width: 2; rx: 28px; filter: url(#lasso); }`)}
      ${focal('filter: url(#ink); stroke-width: 3;')}`],
    c3: ['Loop + wash', 'Loops with a faint wash of colour inside, so the groups read at a glance.', `
      .X { --pele-radius: 10px; }
      ${outline(1.5, 0)}
      ${zones((id, h) => `.X [data-id=${id}] rect { fill: var(--${h}); fill-opacity: .07; stroke: var(--${h}); stroke-opacity: .8; stroke-width: 2; rx: 28px; filter: url(#lasso); }`)}
      ${focal()}`],
  }],
];

const all = directions.flatMap(([, , , vs]) => Object.entries(vs));
const css = all.map(([id, [, , c]]) => (base + c).replaceAll('.X', `.${id}`)).join('\n');
await writeFile(dir + 'personality3.html', `<!doctype html><meta charset=utf-8><title>Diagram personality 3</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=block">
<style>
:root { color-scheme: dark; --bg:#282a36; --surface:#21222c; --alt:#44475a; --fg:#f8f8f2; --muted:#a3a8c3; --line:#c6c8d8; --accent:#bd93f9;
  --cyan:#8be9fd; --purple:#bd93f9; --pink:#ff79c6; --green:#50fa7b; --orange:#ffb86c; --yellow:#f1fa8c; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 "Segoe UI",system-ui,sans-serif; }
main { max-width:720px; margin:0 auto; padding:16px; display:grid; gap:20px; }
.dir { border-top: 1px solid var(--alt); padding-top: 18px; margin-top: 12px; }
.dir h2 { font-size:20px; margin:0 0 4px; } .dir > p { margin:0 0 6px; color:var(--muted); }
h3 { font-size:15px; margin:12px 0 2px; } h3 small { color: var(--muted); font-weight: 400; margin-left: 6px; }
.pele svg { display:block; width:100%; height:auto;
  --pele-bg:var(--bg); --pele-fg:var(--fg); --pele-muted:var(--muted); --pele-line:var(--line);
  --pele-surface:var(--surface); --pele-surface-alt:var(--alt); --pele-border:var(--muted); --pele-accent:var(--accent);
  --pele-font: "Segoe UI", Arial, sans-serif; }
${css}
</style>
<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="ink" filterUnits="userSpaceOnUse" x="-120" y="-60" width="1000" height="380"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
  <filter id="lasso" filterUnits="userSpaceOnUse" x="-120" y="-60" width="1000" height="380"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
</defs></svg>
<main>${directions.map(([k, t, n, vs]) => `<section class="dir" id="dir-${k}"><h2>${k} · ${t}</h2><p>${n}</p>
${Object.entries(vs).map(([id, [vt, vn]]) => `<div id="${id}"><h3>${id.toUpperCase()} · ${vt}<small>${vn}</small></h3><div class="pele ${id}">${flow}</div></div>`).join('\n')}</section>`).join('\n')}</main>`);
