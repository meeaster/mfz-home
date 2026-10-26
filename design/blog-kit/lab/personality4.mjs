// Round 4: the colour system held fixed (neutral boxes, coloured group loops,
// one pink focal box), only the paper behind the diagram varies.
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
const flow = await readFile(dir + 'flow.svg', 'utf8');

const group = { z1: 'cyan', z2: 'purple', z3: 'yellow' };
const dot = (gap) => `background-image: radial-gradient(color-mix(in srgb, var(--muted) 32%, transparent) 1px, transparent 1.3px); background-size: ${gap}px ${gap}px;`;
const line = (c) => `color-mix(in srgb, var(--muted) ${c}%, transparent)`;
const grid = (gap, major) => `background-image:
    ${major ? `linear-gradient(${line(22)} 1px, transparent 1px), linear-gradient(90deg, ${line(22)} 1px, transparent 1px),` : ''}
    linear-gradient(${line(11)} 1px, transparent 1px), linear-gradient(90deg, ${line(11)} 1px, transparent 1px);
  background-size: ${major ? `${gap * major}px ${gap * major}px, ${gap * major}px ${gap * major}px, ` : ''}${gap}px ${gap}px, ${gap}px ${gap}px;`;
const papers = {
  dots12: ['Dots · 12px', 'Tight dots: reads as texture more than as a grid.', dot(12)],
  dots16: ['Dots · 16px', 'The spacing from round 3.', dot(16)],
  dots24: ['Dots · 24px', 'Sparse dots: the most open, closest to plain.', dot(24)],
  grid16: ['Grid · 16px', 'Fine square grid, like graph paper.', grid(16)],
  grid24: ['Grid · 24px + major', 'Wider squares with a stronger line every 5, like an engineering pad.', grid(24, 5)],
  plain: ['Plain', 'No texture, for comparison.', ''],
};

const system = `
  .X { --pele-radius: 10px; }
  .X .pele-node rect { fill: var(--bg); stroke: color-mix(in srgb, var(--muted) 60%, var(--bg)); stroke-width: 1.6; }
  .X .pele-label tspan:first-child { font-weight: 700; }
  .X .pele-label tspan:nth-child(2) { font-size: 12px; fill: var(--muted); }
  ${Object.entries(group).map(([id, h]) => `.X [data-id=${id}] rect { fill: none; stroke: var(--${h}); stroke-opacity: .85; stroke-width: 2; rx: 28px; filter: url(#lasso); }
  .X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`).join('\n')}
  .X .pele-cluster-label { font-family: Kalam, "Segoe Print", cursive; font-size: 20px; text-transform: lowercase; }
  .X [data-id=opw] rect { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
  .X [data-id=opw] .pele-label tspan:first-child { fill: var(--pink); }`;

const css = Object.entries(papers).map(([id, [, , bg]]) => (system + `\n.X { border-radius: 10px; background-color: var(--bg); ${bg} }`).replaceAll('.X', `.${id}`)).join('\n');
await writeFile(dir + 'personality4.html', `<!doctype html><meta charset=utf-8><title>Diagram paper</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=block">
<style>
:root { color-scheme: dark; --bg:#282a36; --surface:#21222c; --alt:#44475a; --fg:#f8f8f2; --muted:#a3a8c3; --line:#c6c8d8; --accent:#bd93f9;
  --cyan:#8be9fd; --purple:#bd93f9; --pink:#ff79c6; --green:#50fa7b; --orange:#ffb86c; --yellow:#f1fa8c; --red:#ff5555; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 "Segoe UI",system-ui,sans-serif; }
main { max-width:720px; margin:0 auto; padding:16px; display:grid; gap:22px; }
.legend { display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 12px; }
.legend div { border: 1px solid var(--alt); border-radius: 8px; padding: 8px 10px; }
.legend b { display:block; font-size: 13px; } .legend span { color: var(--muted); }
.sw { display:inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 3px; vertical-align: -1px; }
h3 { font-size:15px; margin:6px 0 4px; } h3 small { color: var(--muted); font-weight: 400; margin-left: 6px; }
.pele svg { display:block; width:100%; height:auto;
  --pele-bg:var(--bg); --pele-fg:var(--fg); --pele-muted:var(--muted); --pele-line:var(--line);
  --pele-surface:var(--surface); --pele-surface-alt:var(--alt); --pele-border:var(--muted); --pele-accent:var(--accent);
  --pele-font: "Segoe UI", Arial, sans-serif; }
${css}
</style>
<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="lasso" filterUnits="userSpaceOnUse" x="-120" y="-60" width="1000" height="380"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
</defs></svg>
<main>
<div class="legend">
  <div><b>Neutral</b><span><i class="sw" style="background:var(--fg)"></i><i class="sw" style="background:var(--muted)"></i>every box and line</span></div>
  <div><b>Grouping</b><span><i class="sw" style="background:var(--cyan)"></i><i class="sw" style="background:var(--purple)"></i><i class="sw" style="background:var(--yellow)"></i>loops and their labels only</span></div>
  <div><b>Emphasis</b><span><i class="sw" style="background:var(--pink)"></i>one focal box</span></div>
  <div><b>Status</b><span><i class="sw" style="background:var(--green)"></i><i class="sw" style="background:var(--orange)"></i><i class="sw" style="background:var(--red)"></i>literal meaning only</span></div>
</div>
${Object.entries(papers).map(([id, [t, n]]) => `<section id="${id}"><h3>${t}<small>${n}</small></h3><div class="pele ${id}">${flow}</div></section>`).join('\n')}
</main>`);
