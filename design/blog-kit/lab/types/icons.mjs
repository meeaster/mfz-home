// Sequence spacing fix and brand icons, rendered with the gallery's colour system.
import { readFile, writeFile } from 'node:fs/promises';
import { swapIcons, padFrames, selfMessageLabels, invertKnockouts, clusterLabelsClear } from '../pele-post.mjs';
const dir = new URL('.', import.meta.url).pathname;
const gallery = await readFile(dir + 'types.html', 'utf8');
const head = gallery.slice(0, gallery.indexOf('<main>'));

const seq = await readFile(dir + 'seq.svg', 'utf8');
const mono = await swapIcons(await readFile(dir + 'arch-icons.svg', 'utf8'));
const tiled = invertKnockouts(mono);
const flow = await readFile(dir + 'flow.svg', 'utf8');

const extra = `<style>
  .seq svg { --pele-series-1: var(--cyan); }
  .icons [data-id=aws] > rect { stroke: var(--cyan); } .icons [data-id=aws] .pele-cluster-label { fill: var(--cyan); }
  .icons [data-id=eks] > rect { stroke: var(--purple); } .icons [data-id=eks] .pele-cluster-label { fill: var(--purple); }
  .icons .pele-cluster .pele-icon { color: currentColor; }
  .icons [data-id=aws] .pele-icon { color: var(--cyan); } .icons [data-id=eks] > .pele-icon { color: var(--purple); }
  .icons .pele-service .pele-icon { color: var(--fg); }
  .icons .pele-service > rect { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }
  .icons [data-id=opw] > rect { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
  .icons [data-id=opw] .pele-icon { color: var(--pink); } .icons [data-id=opw] .pele-label { fill: var(--pink); font-weight: 700; }
  .icons .pele-label { font-weight: 600; }
  .icons .pele-node .pele-icon-tile { fill: var(--fg) !important; stroke: none !important; } .icons .pele-knockout { color: var(--bg) !important; }
  .icons .pele-node[data-id=opw] .pele-icon-tile { fill: var(--pink) !important; }
  .seq-fixed .pele-edge-label text { font-size: 17px; }
</style>`;
const fig = (cls, id, svg, t, n) => `<section class="card"><h3>${t}</h3><p>${n}</p><div class="fig ${cls}" id="${id}">${svg}</div></section>`;
await writeFile(dir + 'icons.html', head + extra + `<style>.flowfix svg { max-width: 420px; }
 .flowfix [data-id=z1] > rect { stroke: var(--cyan); } .flowfix [data-id=z1] .pele-cluster-label { fill: var(--cyan); }
 .flowfix [data-id=z2] > rect { stroke: var(--purple); } .flowfix [data-id=z2] .pele-cluster-label { fill: var(--purple); }
 .flowfix [data-id=z3] > rect { stroke: var(--yellow); } .flowfix [data-id=z3] .pele-cluster-label { fill: var(--yellow); }</style><main><h1>Spacing and icons</h1><p class="lead">Post-render fixes Pele can't do through CSS, and real brand icons in place of Pele's generic glyphs.</p>
${fig('seq', 'seq-before', seq, 'Sequence · before', 'Pele output as drawn: the par frame hugs its messages, and "scan + redact" sits on its own loop.')}
${fig('seq seq-fixed', 'seq-after', selfMessageLabels(padFrames(seq)), 'Sequence · after', 'Frame grown by 12px on each side and 8px top and bottom; the self-message label moved to the right of its loop.')}
${fig('arch icons', 'arch-mono', mono, 'Architecture · before', 'Datadog drawn as Simple Icons ships it: a knockout mark, so on dark the solid square dominates and the dog is lost.')}
${fig('arch icons', 'arch-tiled', tiled, 'Architecture · after', 'Knockout logos get a light tile with the mark drawn dark, so the dog reads. The focal OPW tile is pink.')}
${fig('flowfix', 'flow-before', flow, 'Flowchart · before', 'Pele centres group labels at the top, so the line into dev-core vpc runs through its label.')}
${fig('flowfix', 'flow-after', clusterLabelsClear(flow), 'Flowchart · after', 'Group labels move to the top-left corner, clear of the lines entering from above.')}
</main>`);
