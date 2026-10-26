// Handwritten notes on two gallery diagrams, rendered with the gallery's colour system.
import { readFile, writeFile } from 'node:fs/promises';
import { fixAll, addNotes, locate } from '../pele-post.mjs';
const dir = new URL('.', import.meta.url).pathname;
const gallery = await readFile(dir + 'types.html', 'utf8');
const head = gallery.slice(0, gallery.indexOf('<main>'));
const load = async (id) => fixAll(await readFile(`${dir}${id}.svg`, 'utf8'), await readFile(`${dir}${id}.mmd`, 'utf8'));

// Notes are placed from the layout with locate(), so they follow it if the diagram changes.
// Chart: a pink note pointing at the peak, saying what the bars only imply.
let xy = await load('xy');
const peak = locate(xy, 'bar-4');
xy = addNotes(xy, [{ x: peak.cx + 34, y: peak.y - 30, emphasis: true, text: 'peak: 5× the 04:00 low', path: `M${peak.cx + 30},${peak.y - 34}C${peak.cx + 10},${peak.y - 34} ${peak.cx},${peak.y - 24} ${peak.cx},${peak.y - 8}` }]);

// Architecture: what travels on each line, clear of the group loops: "every log" above the S3 box,
// "SSNs redacted" in the gap between the VPC loop's bottom and Datadog.
let arch = await load('arch');
const s3 = locate(arch, 's3'), vpc = locate(arch, 'vpc'), toDd = locate(arch, 'opw-dd');
arch = addNotes(arch, [
  { x: s3.cx, y: s3.y - 12, anchor: 'middle', text: 'every log' },
  { x: toDd.x + 12, y: (vpc.y + vpc.h + toDd.y + toDd.h) / 2 + 6, text: 'SSNs redacted' },
]);

const fig = (cls, id, svg, t, n) => `<section class="card"><h3>${t}</h3><p>${n}</p><div class="fig ${cls}" id="${id}">${svg}</div></section>`;
await writeFile(dir + 'notes.html', head + `<main><h1>Handwritten notes</h1><p class="lead">A note says what the diagram can't: the number the bars imply, or what travels on a line Mermaid can't label.</p>
${fig('xy', 'notes-xy', xy, 'On a chart', 'Pink, because it points at the emphasis.')}
${fig('arch', 'notes-arch', arch, 'On an architecture diagram', 'Muted: what travels on each line.')}
</main>
<script src="../pen.js"></script>`);
console.log('notes.html written');
