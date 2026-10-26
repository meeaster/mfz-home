// Candidate drawing styles between "clean" and "chalkboard": real Pele output,
// restyled with page CSS only.
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
const flow = await readFile(dir + 'flow.svg', 'utf8');

const hue = { agent: 'cyan', nlb: 'cyan', opw: 'purple', dd: 'pink', s3: 'pink', z1: 'cyan', z2: 'purple', z3: 'pink' };
const perNode = (rule) => Object.entries(hue).filter(([id]) => !id.startsWith('z')).map(([id, h]) => rule(id, h)).join('\n');
const perZone = (rule) => Object.entries(hue).filter(([id]) => id.startsWith('z')).map(([id, h]) => rule(id, h)).join('\n');
const sub = `.X .pele-label tspan:nth-child(2) { font-size: 12px; fill: var(--muted); }`;
const hand = `font-family: Kalam, "Segoe Print", cursive;`;

const styles = {
  sticker: ['Sticker', 'Tinted cards with a coloured edge and a hard offset shadow, like stickers on a board. Zone labels handwritten.', `
    .X { --pele-radius: 14px; }
    ${perNode((id, h) => `.X [data-id=${id}] rect { fill: color-mix(in srgb, var(--${h}) 16%, var(--bg)); stroke: var(--${h}); stroke-width: 2; filter: drop-shadow(4px 4px 0 color-mix(in srgb, var(--${h}) 45%, #000)); }`)}
    .X .pele-label tspan:first-child { font-weight: 700; } ${sub}
    .X .pele-cluster rect { fill: none; stroke: var(--alt); stroke-dasharray: 2 6; stroke-width: 2; stroke-linecap: round; }
    ${perZone((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { ${hand} font-size: 19px; font-weight: 700; }
    .X .pele-edges { stroke-width: 2; }`],
  annotated: ['Annotated', 'The clean style, plus a handwritten layer: zone labels in marker, and the focal box circled by hand. Precise drawing, human commentary.', `
    .X { --pele-radius: 10px; }
    .X .pele-node rect { fill: var(--alt); stroke: none; }
    ${sub}
    .X .pele-cluster rect { fill: none; stroke: var(--alt); stroke-dasharray: 5 5; }
    ${perZone((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { ${hand} font-size: 20px; }
    .X [data-id=opw] rect { stroke: var(--pink); stroke-width: 2.5; filter: url(#marker); }`],
  glow: ['Neon', 'Dark cards with a soft glow in each zone colour. The most Dracula of the four; keep it for diagrams with few boxes.', `
    .X { --pele-radius: 12px; }
    ${perNode((id, h) => `.X [data-id=${id}] rect { fill: color-mix(in srgb, var(--${h}) 8%, var(--bg)); stroke: var(--${h}); stroke-width: 1.5; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--${h}) 70%, transparent)); }`)}
    ${sub}
    .X .pele-cluster rect { fill: none; stroke: none; }
    ${perZone((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; }
    .X .pele-edges { stroke: var(--purple); stroke-width: 1.5; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--purple) 80%, transparent)); }
    .X .pele-marker { fill: var(--purple); }`],
  sketchlite: ['Sketch-lite', 'Chalkboard turned down: a faint hand-drawn wobble on filled cards, clean type. Reads as drawn, not as a draft.', `
    .X { --pele-radius: 14px; }
    .X .pele-node rect, .X .pele-edge path, .X .pele-cluster rect { filter: url(#wobble); }
    ${perNode((id, h) => `.X [data-id=${id}] rect { fill: color-mix(in srgb, var(--${h}) 12%, var(--bg)); stroke: var(--${h}); stroke-width: 1.6; }`)}
    ${sub}
    .X .pele-cluster rect { fill: none; stroke: var(--muted); stroke-opacity: .5; stroke-dasharray: 8 6; stroke-width: 1.4; }
    ${perZone((id, h) => `.X [data-id=${id}] .pele-cluster-label { fill: var(--${h}); }`)}
    .X .pele-cluster-label { ${hand} font-size: 18px; }
    .X .pele-edges { stroke-width: 1.6; }`],
};
const css = Object.entries(styles).map(([id, [, , c]]) => c.replaceAll('.X', `.${id}`)).join('\n');
await writeFile(dir + 'personality.html', `<!doctype html><meta charset=utf-8><title>Diagram personality</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=block">
<style>
:root { color-scheme: dark; --bg:#282a36; --surface:#21222c; --alt:#44475a; --fg:#f8f8f2; --muted:#a3a8c3; --line:#c6c8d8; --accent:#bd93f9;
  --cyan:#8be9fd; --purple:#bd93f9; --pink:#ff79c6; --green:#50fa7b; --orange:#ffb86c; --yellow:#f1fa8c; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 "Segoe UI",system-ui,sans-serif; }
main { max-width:720px; margin:0 auto; padding:16px; display:grid; gap:28px; }
h2 { font-size:16px; margin:0 0 2px; } p { margin:0 0 10px; color:var(--muted); font-size:13px; }
.pele svg { display:block; width:100%; height:auto;
  --pele-bg:var(--bg); --pele-fg:var(--fg); --pele-muted:var(--muted); --pele-line:var(--line);
  --pele-surface:var(--surface); --pele-surface-alt:var(--alt); --pele-border:var(--muted); --pele-accent:var(--accent);
  --pele-font: "Segoe UI", Arial, sans-serif; }
${css}
</style>
<svg width="0" height="0" style="position:absolute">
  <filter id="marker" filterUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>
  <filter id="wobble" filterUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="11"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter>
</svg>
<main>${Object.entries(styles).map(([id, [t, n]]) => `<section id="${id}"><h2>${t}</h2><p>${n}</p><div class="pele ${id}">${flow}</div></section>`).join('\n')}</main>`);
