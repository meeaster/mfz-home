// Diagrams used on the design file's Components page, in the gallery's style (dots, the pen), for baking.
// terms: the "diagram with terms" figure. Its groups are numbered in their labels, and each takes the hue its
// numbered term group repeats; OPW is the focus.
import { readFile, writeFile } from 'node:fs/promises';
import { fixAll } from '../pele-post.mjs';

const dir = new URL('.', import.meta.url).pathname;

const gallery = await readFile(dir + 'types.html', 'utf8');
const head = gallery.slice(0, gallery.indexOf('<main>')).replace('<title>Diagram types</title>', '<title>Component diagrams</title>');

// A group's number is set in the sans: Kalam's 1 reads as an I, as its 5 reads as an S.
const terms = (await fixAll(await readFile(dir + 'terms.svg', 'utf8'), await readFile(dir + 'terms.mmd', 'utf8')))
  .replace(/(class="pele-cluster-label"[^>]*>)(\d+)( · )/g, '$1<tspan class="num">$2</tspan>$3');

const groups = { z1: 'cyan', z2: 'purple', z3: 'yellow' };

await writeFile(dir + 'components.html', head + `<style>
${Object.entries(groups).map(([g, h]) => `.terms [data-id=${g}] > rect { stroke: var(--${h}); } .terms [data-id=${g}] .pele-cluster-label { fill: var(--${h}); }`).join('\n')}
.terms [data-id="opw"] :is(rect, polygon, path, circle):not(.pele-icon *, .pele-icon-tile) { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
.terms .pele-cluster-label .num { font-family: "Segoe UI", Arial, sans-serif; font-size: 14px; font-weight: 700; }
.terms [data-id="opw"] .pele-label tspan:first-child, .terms [data-id="opw"] .pele-label { fill: var(--pink); }
</style>
<main><h1>Component diagrams</h1>
<section class="card"><h3>Diagram with terms</h3><p>One server's logs take one path in and leave as two copies.</p><div class="fig terms" id="fig-terms">${terms}</div></section>
</main>
<script src="../pen.js"></script>`);

console.log('components.html written');
