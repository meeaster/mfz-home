// Icon treatment variants for architecture and sequence diagrams. Exploration only:
// whichever treatment wins moves into ../pele-post.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { swapIcons, padFrames, selfMessageLabels, centreTags } from '../pele-post.mjs';
const dir = new URL('.', import.meta.url).pathname;
const gallery = await readFile(dir + 'types.html', 'utf8');
const head = gallery.slice(0, gallery.indexOf('<main>'));

const packs = {};
async function icon(name) {
  const [prefix, id] = name.split(':');
  packs[prefix] ??= JSON.parse(await readFile(new URL(`../node_modules/@iconify-json/${prefix}/icons.json`, import.meta.url)));
  const p = packs[prefix], found = p.icons[id];
  return { body: found.body, w: found.width ?? p.width ?? 24, h: found.height ?? p.height ?? 24 };
}
const glyph = async (name, cx, cy, size, cls = '') => {
  const i = await icon(name);
  return `<svg class="pele-icon pele-brand ${cls}" data-icon="${name}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" viewBox="0 0 ${i.w} ${i.h}">${i.body}</svg>`;
};
const tile = async (name, cx, cy, size, pad) =>
  `<rect class="pele-icon-tile" x="${cx - size / 2 - pad}" y="${cy - size / 2 - pad}" width="${size + 2 * pad}" height="${size + 2 * pad}" rx="${(size + 2 * pad) / 4}"/>` + (await glyph(name, cx, cy, size, 'pele-knockout'));

// Architecture: rebuild each service icon at a chosen size, plain or on a tile.
async function archIcons(svg, { tiled, size = 24, pad = 4, dy = 0 }) {
  const re = /<svg class="pele-icon pele-brand" data-icon="([^"]+)" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*>[\s\S]*?<\/svg>/g;
  let out = '', last = 0;
  for (const m of svg.matchAll(re)) {
    const inService = /pele-service[^>]*>\s*<rect[^>]*>\s*$/.test(svg.slice(Math.max(0, m.index - 400), m.index));
    const [x, y, w] = [+m[2], +m[3], +m[4]];
    const cx = x + w / 2, cy = y + w / 2 + (inService ? dy : 0);
    out += svg.slice(last, m.index) + (inService ? (tiled ? await tile(m[1], cx, cy, size, pad) : await glyph(m[1], cx, cy, size)) : m[0]);
    last = m.index + m[0].length;
  }
  return out + svg.slice(last);
}

// Sequence: give every participant box (header and footer) an icon.
const actorIcon = { A: 'lucide:server', N: 'simple-icons:awselasticloadbalancing', W: 'simple-icons:datadog', D: 'simple-icons:datadog', S: 'simple-icons:amazons3' };
async function seqIcons(svg, mode) {
  const re = /<g class="pele-node pele-actor[^"]*" data-id="([^"]+)">\s*<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)>\s*<text class="pele-label" x="([-\d.]+)" y="([-\d.]+)"([^>]*)>([^<]*)<\/text>\s*<\/g>/g;
  let out = '', last = 0;
  for (const m of svg.matchAll(re)) {
    const [id, x, y, w, h, rectRest, tx, ty, textRest, label] = [m[1], +m[2], +m[3], +m[4], +m[5], m[6], +m[7], +m[8], m[9], m[10]];
    const name = actorIcon[id], cls = m[0].match(/class="([^"]+)"/)[1];
    let g;
    if (mode === 'beside') {
      // Widen the box by the icon's width and put the icon left of the name.
      const grow = 26, nx = x - grow / 2, nw = w + grow;
      g = `<rect x="${nx}" y="${y}" width="${nw}" height="${h}"${rectRest}/>` + (await tile(name, nx + 18, y + h / 2, 14, 3)) +
        `<text class="pele-label" x="${tx + grow / 2 - 2}" y="${ty}"${textRest}>${label}</text>`;
    } else if (mode === 'stacked') {
      // No box: the icon is the participant, its name underneath.
      const cy = y + 12;
      g = (await tile(name, tx, cy, 18, 5)) + `<text class="pele-label" x="${tx}" y="${y + h + 4}"${textRest}>${label}</text>`;
    } else {
      // Corner badge: the box stays, a small tile sits on its top-left corner.
      g = `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rectRest}/>` + (await tile(name, x + 4, y + 4, 12, 3)) +
        `<text class="pele-label" x="${tx}" y="${ty}"${textRest}>${label}</text>`;
    }
    out += svg.slice(last, m.index) + `<g class="${cls}" data-id="${id}">${g}</g>`;
    last = m.index + m[0].length;
  }
  out += svg.slice(last);
  // Stacked icons rise above the top of the original boxes; give the viewBox room.
  return mode === 'stacked' ? out.replace(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)" width="([\d.]+)" height="([\d.]+)"/, (_, a, b, c, d, w, h) => `viewBox="${a} ${+b - 14} ${c} ${+d + 28}" width="${w}" height="${+h + 28}"`) : out;
}

const arch = await swapIcons(await readFile(dir + 'arch-icons.svg', 'utf8'));
const seq = selfMessageLabels(centreTags(padFrames(await readFile(dir + 'seq.svg', 'utf8'))));
const variants = [
  ['arch', 'a-plain', await archIcons(arch, { tiled: false }), 'A1 · Icons never coloured', 'White icons in neutral boxes. Focus comes from the box outline and label only; the icon itself is never pink.'],
  ['arch', 'a-tile', await archIcons(arch, { tiled: true, size: 20, pad: 4 }), 'A2 · Every icon inverted, box kept', 'Every icon on a light tile, dark mark, inside the neutral box.'],
  ['arch nobox', 'a-tile-nobox', await archIcons(arch, { tiled: true, size: 28, pad: 6, dy: 0 }), 'A3 · Inverted tile is the node, no box', 'The tile replaces the box. Focus is a pink ring around the tile and a pink label.'],
  ['arch nobox', 'a-plain-nobox', await archIcons(arch, { tiled: false, size: 34 }), 'A4 · Bare icon, no box, no tile', 'Just the white mark, larger, with its name underneath. The lightest option.'],
  ['seq', 's-beside', await seqIcons(seq, 'beside'), 'S1 · Icon beside the name', 'Each participant box widens to fit a small inverted tile to the left of its name.'],
  ['seq stacked', 's-stacked', await seqIcons(seq, 'stacked'), 'S2 · Icon above the name, no box', 'The tile is the participant; the name sits underneath, like the architecture diagram.'],
  ['seq', 's-badge', await seqIcons(seq, 'badge'), 'S3 · Corner badge', 'The box stays as it is; a small tile sits on its top-left corner.'],
];
const css = `<style>
  .fig .pele-node .pele-icon-tile { fill: var(--fg) !important; stroke: none !important; }
  .fig .pele-knockout { color: var(--bg) !important; }
  .fig .pele-brand:not(.pele-knockout) { color: var(--fg); }
  .arch [data-id=aws] > rect { stroke: var(--cyan); } .arch [data-id=aws] .pele-cluster-label { fill: var(--cyan); }
  .arch [data-id=eks] > rect { stroke: var(--purple); } .arch [data-id=eks] .pele-cluster-label { fill: var(--purple); }
  .arch .pele-cluster .pele-icon { color: var(--muted); }
  .arch .pele-service > rect { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }
  .arch .pele-label { font-weight: 600; }
  .arch [data-id=opw] > rect:not(.pele-icon-tile) { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
  .arch [data-id=opw] .pele-label, .seq [data-id=W] .pele-label { fill: var(--pink) !important; font-weight: 700; }
  .nobox .pele-service > rect:not(.pele-icon-tile) { display: none; }
  .nobox [data-id=opw] .pele-icon-tile { stroke: var(--pink) !important; stroke-width: 3px; paint-order: stroke; }
  .seq [data-id=W] > rect:not(.pele-icon-tile) { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
  .stacked .pele-actor > rect:not(.pele-icon-tile) { display: none; }
  .stacked [data-id=W] .pele-icon-tile { stroke: var(--pink) !important; stroke-width: 3px; }
</style>`;
const fig = ([cls, id, svg, t, n]) => `<section class="card"><h3>${t}</h3><p>${n}</p><div class="fig ${cls}" id="${id}">${svg}</div></section>`;
await writeFile(dir + 'icon-variants.html', head + css + `<main><h1>Icon treatments</h1><p class="lead">Icons are never coloured. Architecture A1–A4 and sequence S1–S3, all on the 16px grid with the colour system.</p>
${variants.map(fig).join('\n')}</main>
<script src="../pen.js"></script>`);
