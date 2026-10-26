// Builds svg/anatomy-sequence.svg: the S1 sequence diagram with numbered callouts measuring the spacing rules.
// Measures the clean layout on the lab page (the pen set aside, so frames are exact rectangles), then annotates the
// baked SVG, which carries the pen in the same coordinates.
// Usage: node anatomy.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), 'anatomy-'));
execFileSync('node', [here + 'bake.mjs', here + 'types/icon-variants.html', tmp, 's-beside'], { stdio: 'ignore' });

const ab = (...args) => execFileSync('agent-browser', ['--session', 'anatomy', ...args], { encoding: 'utf8', input: args.at(-1) === '--stdin' ? measure : undefined });
const measure = `(() => {
  window.pen?.undo();
  const root = document.querySelector('#s-beside svg');
  const inv = root.getScreenCTM().inverse();
  const box = (el) => {
    const b = el.getBBox(), m = inv.multiply(el.getScreenCTM());
    const [p, q] = [[b.x, b.y], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    return { l: p.x, t: p.y, r: q.x, b: q.y };
  };
  const q = (s) => [...root.querySelectorAll(s)];
  return JSON.stringify({
    msgs: q('.pele-message').map(box), labels: q('.pele-edge-label text').map(box), lifelines: q('.pele-lifeline').map(box),
    frame: box(root.querySelector('.pele-frame-par rect')), kind: box(root.querySelector('.pele-frame-kind')),
    act: box(root.querySelector('.pele-activation')),
    tile: box(root.querySelector('.pele-actor-footer .pele-icon-tile')), icon: box(root.querySelector('.pele-actor-footer .pele-icon')),
  });
})()`;
for (let attempt = 1; ; attempt++) {
  try { ab('open', 'file://' + here + 'types/icon-variants.html'); break; } catch (e) { if (attempt === 3) throw e; }
}
// Label widths depend on Kalam, a web font; measure only once it has loaded.
ab('eval', 'document.fonts.ready.then(() => document.fonts.check("17px Kalam"))');
const m = JSON.parse(JSON.parse(ab('--json', 'eval', '--stdin')).data.result);
ab('close');

// Measurement overlay, in orange: nothing in this diagram uses status orange, and the legend says it is not part of the diagram.
const mark = '#ffb86c', bg = '#282a36';
const mid = (b) => (b.t + b.b) / 2;
const out = [];
// A gap: a translucent band across it with solid edges, the way design tools show spacing.
const gap = (x1, y1, x2, y2) => {
  const v = x1 === x2, w = 10;
  const [x, y, bw, bh] = v ? [x1 - w / 2, Math.min(y1, y2), w, Math.abs(y2 - y1)] : [Math.min(x1, x2), y1 - w / 2, Math.abs(x2 - x1), w];
  out.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${mark}" fill-opacity="0.45"/>`);
  for (const e of v ? [[x, y, x + bw, y], [x, y + bh, x + bw, y + bh]] : [[x, y, x, y + bh], [x + bw, y, x + bw, y + bh]])
    out.push(`<path d="M${e[0]} ${e[1]}L${e[2]} ${e[3]}" stroke="${mark}" stroke-width="1"/>`);
};
// A tag: number and measured value, with a leader to the gap it explains.
const tag = (n, value, x, y, tx, ty) => {
  const text = value == null ? '' : String(Math.round(value));
  const w = 18 + (text ? 7 * text.length + 6 : 0);
  out.push(`<path d="M${x} ${y}L${tx} ${ty}" stroke="${mark}" stroke-width="1"/>`);
  out.push(`<rect x="${x - 9}" y="${y - 9}" width="${w}" height="18" rx="9" fill="${bg}" stroke="${mark}" stroke-width="1"/>`);
  out.push(`<circle cx="${x}" cy="${y}" r="7" fill="${mark}"/>`);
  out.push(`<text x="${x}" y="${y + 3.8}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10.5" font-weight="700" fill="${bg}">${n}</text>`);
  if (text) out.push(`<text x="${x + 11}" y="${y + 4}" font-family="JetBrains Mono, Consolas, monospace" font-size="11" fill="${mark}">${text}</text>`);
};

const [send, , self] = m.msgs;
const [, forwardLabel, selfLabel] = m.labels;
const nlb = m.lifelines[1];

// 1 · text keeps ≥3 clear of any other line: "forward :8282" to the NLB lifeline.
const y1 = mid(forwardLabel);
gap(nlb.l, y1, forwardLabel.l, y1);
tag(1, forwardLabel.l - nlb.l, nlb.l - 42, y1 + 18, nlb.l, y1 + 5);
// 2 · self-message label 10 right of its loop.
const y2 = mid(selfLabel);
gap(self.r, y2, selfLabel.l, y2);
tag(2, selfLabel.l - self.r, self.r + 16, self.t - 14, (self.r + selfLabel.l) / 2, y2 - 5);
// 3 · text keeps ≥4 from a frame outline: the par tag to the frame top.
const x3 = m.kind.l + 6;
gap(x3, m.frame.t, x3, m.kind.t);
tag(3, m.kind.t - m.frame.t, m.frame.l - 44, m.frame.t + 6, x3 - 5, (m.frame.t + m.kind.t) / 2);
// 4 · frames pad 8 below their content: activation end to the frame bottom.
const x4 = (m.act.l + m.act.r) / 2;
gap(x4, m.act.b, x4, m.frame.b);
tag(4, m.frame.b - m.act.b, m.frame.l - 44, m.frame.b + 2, x4 - 5, (m.act.b + m.frame.b) / 2);
// 5 · icon inset 4 inside its 20px tile.
const y5 = (m.tile.t + m.tile.b) / 2;
gap(m.tile.l, y5, m.icon.l, y5);
tag(5, m.icon.l - m.tile.l, m.tile.l + 30, m.tile.t - 18, (m.tile.l + m.icon.l) / 2, m.tile.t);
// 6 · a label may sit on its own straight line.
const y6 = mid(send);
tag(6, null, send.l + 40, y6 + 18, send.l + 40, y6 + 1);

const values = {
  1: forwardLabel.l - nlb.l, 2: selfLabel.l - self.r, 3: m.kind.t - m.frame.t, 4: m.frame.b - m.act.b, 5: m.icon.l - m.tile.l, tile: m.tile.r - m.tile.l,
};
const svg = readFileSync(join(tmp, 's-beside.svg'), 'utf8').replace(/<\/svg>$/, `<g id="anatomy">${out.join('')}</g></svg>`);
writeFileSync(here + '../svg/anatomy-sequence.svg', svg);
console.log(JSON.stringify(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, +v.toFixed(1)]))));
