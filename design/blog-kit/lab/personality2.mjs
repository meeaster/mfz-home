// Five more drawing-style explorations, from restrained to wild. Same Pele
// output as personality.mjs; only page CSS (and shared SVG defs) change.
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
const flow = await readFile(dir + 'flow.svg', 'utf8');

const hue = { agent: 'cyan', nlb: 'cyan', opw: 'purple', dd: 'pink', s3: 'pink' };
const zone = { z1: 'cyan', z2: 'purple', z3: 'pink' };
const nodes = (rule) => Object.entries(hue).map(([id, h]) => rule(id, h)).join('\n');
const zones = (rule) => Object.entries(zone).map(([id, h]) => rule(id, h)).join('\n');
const sub = `.X .pele-label tspan:nth-child(2) { font-size: 12px; fill: var(--muted); }`;
const hand = `font-family: Kalam, "Segoe Print", cursive;`;
// Rotate nodes without losing Pele's translate: the individual rotate property composes with transform.
const tilt = `.X .pele-node { transform-box: fill-box; transform-origin: center; }
  .X [data-id=agent] { rotate: -1.5deg } .X [data-id=nlb] { rotate: 1.2deg } .X [data-id=opw] { rotate: -1deg } .X [data-id=dd] { rotate: 1deg } .X [data-id=s3] { rotate: -1.4deg }`;

const styles = {
  pastel: ['1 · Soft pastel', 'Restrained', 'Sticker without the edges: borderless pastel cards, colour-tinted titles, zones as soft washes. The calmest option with colour.', `
    .X { --pele-radius: 16px; }
    ${nodes((id, h) => `.X [data-id=${id}] rect { fill: color-mix(in srgb, var(--${h}) 22%, var(--bg)); stroke: none; } .X [data-id=${id}] .pele-label tspan:first-child { fill: var(--${h}); font-weight: 700; }`)}
    ${sub}
    ${zones((id, h) => `.X [data-id=${id}] rect { fill: var(--${h}); fill-opacity: .06; stroke: none; } .X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { font-size: 13px; font-weight: 600; }
    .X [data-id=opw] rect { fill: var(--pink); } .X [data-id=opw] .pele-label tspan { fill: var(--bg) !important; }`],
  notebook: ['2 · Notebook', 'Playful', 'Dot-grid paper, sticker cards, and every label the author adds (zones) in handwriting. The focal box gets a yellow highlighter swipe.', `
    .X { --pele-radius: 12px; border-radius: 10px; background-color: var(--bg);
      background-image: radial-gradient(color-mix(in srgb, var(--muted) 35%, transparent) 1px, transparent 1.2px); background-size: 16px 16px; }
    ${nodes((id, h) => `.X [data-id=${id}] rect { fill: var(--surface); stroke: var(--${h}); stroke-width: 1.6; }`)}
    ${sub}
    .X .pele-label tspan:first-child { font-weight: 700; }
    .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .6; stroke-dasharray: 1 7; stroke-width: 2.4; stroke-linecap: round; }
    ${zones((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { ${hand} font-size: 20px; font-weight: 700; }
    .X [data-id=opw] rect { fill: color-mix(in srgb, var(--yellow) 85%, var(--bg)); stroke: none; filter: url(#marker); }
    .X [data-id=opw] .pele-label tspan { fill: var(--bg) !important; }`],
  tape: ['3 · Washi tape', 'Crafty', 'Paper cards pinned with a strip of coloured tape and set slightly askew. The focal card is taped in pink and sits straight.', `
    .X { --pele-radius: 4px; }
    ${tilt}
    .X .pele-node rect { fill: #e9e6f3; stroke: none; filter: drop-shadow(0 4px 6px rgb(0 0 0 / .4)); }
    .X .pele-label { fill: #282a36; } .X .pele-label tspan:first-child { font-weight: 700; }
    .X .pele-label tspan:nth-child(2) { font-size: 12px; fill: #5b5f7a; }
    ${nodes((id, h) => `.X [data-id=${id}] { --tape: var(--${h}); }`)}
    .X .pele-node::after { content: none; }
    .X .pele-cluster rect { fill: none; stroke: none; }
    ${zones((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { ${hand} font-size: 20px; font-weight: 700; }
    .X [data-id=opw] { rotate: 0deg; } .X [data-id=opw] rect { fill: #fff; outline: none; }
    .X .pele-edges { stroke-width: 1.8; stroke-dasharray: 5 4; }`],
  paper: ['4 · Layered paper', 'Bold', 'Each card is a stack of coloured paper offset behind it, and zones are big rounded colour fields. Depth without isometric drawing.', `
    .X { --pele-radius: 14px; }
    ${nodes((id, h) => `.X [data-id=${id}] rect { fill: var(--surface); stroke: var(--${h}); stroke-width: 1.5;
      filter: drop-shadow(3px 3px 0 color-mix(in srgb, var(--${h}) 70%, var(--bg))) drop-shadow(3px 3px 0 color-mix(in srgb, var(--${h}) 35%, var(--bg))); }`)}
    ${sub}
    .X .pele-label tspan:first-child { font-weight: 700; }
    ${zones((id, h) => `.X [data-id=${id}] rect { fill: color-mix(in srgb, var(--${h}) 14%, var(--bg)); stroke: none; rx: 26px; } .X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .X [data-id=opw] rect { fill: var(--pink); stroke: var(--bg); filter: drop-shadow(3px 3px 0 var(--purple)) drop-shadow(3px 3px 0 var(--cyan)); }
    .X [data-id=opw] .pele-label tspan { fill: var(--bg) !important; }
    .X .pele-edges { stroke-width: 2.2; }`],
  zine: ['5 · Zine', 'Wild', 'Comic-book: solid Dracula colours, thick ink outlines, halftone dots in the zones, chunky arrows. Loud on purpose; a poster, not a reference diagram.', `
    .X { --pele-radius: 10px; }
    ${nodes((id, h) => `.X [data-id=${id}] rect { fill: var(--${h}); stroke: #14151c; stroke-width: 3.5; filter: drop-shadow(5px 5px 0 #14151c); }`)}
    .X .pele-label, .X .pele-label tspan { fill: #14151c !important; font-weight: 800; }
    .X .pele-label tspan:nth-child(2) { font-size: 12px; font-weight: 600; }
    ${zones((id, h) => `.X [data-id=${id}] rect { fill: url(#dots-${h}); stroke: #14151c; stroke-width: 3; } .X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { ${hand} font-size: 18px; font-weight: 700; paint-order: stroke; stroke: #14151c; stroke-width: 5px; }
    .X .pele-edges { stroke: var(--fg); stroke-width: 3.5; } .X .pele-marker { fill: var(--fg); }
    .X [data-id=opw] rect { fill: var(--yellow); stroke-width: 4.5; }`],
};

const css = Object.entries(styles).map(([id, [, , , c]]) => c.replaceAll('.X', `.${id}`)).join('\n');
const dots = ['cyan', 'purple', 'pink'].map((h) => `<pattern id="dots-${h}" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="color-mix(in srgb, var(--${h}) 18%, var(--bg))"/><circle cx="4.5" cy="4.5" r="1.6" fill="var(--${h})" fill-opacity=".55"/></pattern>`).join('');
await writeFile(dir + 'personality2.html', `<!doctype html><meta charset=utf-8><title>Diagram personality 2</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=block">
<style>
:root { color-scheme: dark; --bg:#282a36; --surface:#21222c; --alt:#44475a; --fg:#f8f8f2; --muted:#a3a8c3; --line:#c6c8d8; --accent:#bd93f9;
  --cyan:#8be9fd; --purple:#bd93f9; --pink:#ff79c6; --green:#50fa7b; --orange:#ffb86c; --yellow:#f1fa8c; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 "Segoe UI",system-ui,sans-serif; }
main { max-width:720px; margin:0 auto; padding:16px; display:grid; gap:28px; }
h2 { font-size:16px; margin:0 0 2px; } h2 small { color: var(--muted); font-weight: 400; margin-left: 6px; } p { margin:0 0 10px; color:var(--muted); font-size:13px; }
.pele svg { display:block; width:100%; height:auto;
  --pele-bg:var(--bg); --pele-fg:var(--fg); --pele-muted:var(--muted); --pele-line:var(--line);
  --pele-surface:var(--surface); --pele-surface-alt:var(--alt); --pele-border:var(--muted); --pele-accent:var(--accent);
  --pele-font: "Segoe UI", Arial, sans-serif; }
${css}
</style>
<svg width="0" height="0" style="position:absolute"><defs>${dots}
  <filter id="marker" filterUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
</defs></svg>
<main>${Object.entries(styles).map(([id, [t, lvl, n]]) => `<section id="${id}"><h2>${t}<small>${lvl}</small></h2><p>${n}</p><div class="pele ${id}">${flow}</div></section>`).join('\n')}</main>
<script>
// Tape: place a 34px dash at the top-centre of each card. A rect's stroke starts at its top-left corner,
// so the gap before the dash is (width - 34) / 2. Static fallback: no tape without JavaScript.
for (const g of document.querySelectorAll('.tape .pele-node')) {
  const r = g.querySelector('rect'); if (!r) continue;
  const w = r.width.baseVal.value;
  const h = getComputedStyle(document.documentElement).getPropertyValue('--' + ({agent:'cyan',nlb:'cyan',opw:'pink',dd:'pink',s3:'pink'})[g.dataset.id]);
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  t.setAttribute('x', -17); t.setAttribute('y', r.y.baseVal.value - 7); t.setAttribute('width', 34); t.setAttribute('height', 13);
  t.style.fill = h.trim(); t.style.fillOpacity = ".75"; t.style.filter = "none"; t.style.stroke = "none"; t.setAttribute('transform', 'rotate(-4)');
  g.appendChild(t);
}
</script>`);
