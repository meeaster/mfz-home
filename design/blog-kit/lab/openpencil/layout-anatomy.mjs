// Builds svg/layout-anatomy.svg: a schematic of an article page at a 1440px desktop viewport, with numbered
// orange measurement bands for the layout rules (the same convention as the spacing anatomy). Widths follow
// the rules: content column min(1040px, 100vw − 352px), components one tab (48px) in, figures as wide as their
// diagram and centred, a narrow diagram's text beside it, the contents list in the left margin.
// Usage: node layout-anatomy.mjs
import { writeFileSync } from 'node:fs';

const W = 1440, H = 1250;
const C = { bg: '#282a36', surface: '#21222c', border: '#44475a', fg: '#f8f8f2', muted: '#a3a8c3', neutral: '#6f7389',
  cyan: '#8be9fd', purple: '#bd93f9', yellow: '#f1fa8c', pink: '#ff79c6', green: '#50fa7b', mark: '#ffb86c' };
const col = { x: 200, w: 1040 }, tab = 48, inset = { x: col.x + tab, w: col.w - 2 * tab };
const out = [];
const rect = (x, y, w, h, a = {}) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}"${Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('')}/>`);
const text = (x, y, s, a = {}) => out.push(`<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif"${Object.entries({ 'font-size': 13, fill: C.muted, ...a }).map(([k, v]) => ` ${k}="${v}"`).join('')}>${s}</text>`);
// A line of text as a bar, the way wireframes show copy.
const bar = (x, y, w, c = C.muted, o = 0.32, h = 9) => rect(x, y, w, h, { rx: 4.5, fill: c, 'fill-opacity': o });
const prose = (y, n, last = 0.62) => { for (let i = 0; i < n; i++) bar(col.x, y + i * 24, i === n - 1 ? col.w * last : col.w, C.fg, 0.22); return y + n * 24; };
const card = (x, y, w, h) => rect(x, y, w, h, { rx: 12, fill: C.surface, stroke: C.border, 'stroke-width': 1 });

rect(0, 0, W, H, { fill: C.bg });
// Contents list in the left margin.
text(28, 66, 'ON THIS PAGE', { 'font-size': 11, 'font-weight': 700, 'letter-spacing': 1.2 });
rect(28, 82, 1, 300, { fill: C.border });
for (let i = 0; i < 11; i++) {
  const y = 92 + i * 26, on = i === 2;
  if (on) rect(28, y - 6, 2, 22, { fill: C.purple });
  bar(i > 2 && i < 7 ? 52 : 42, y, [100, 80, 92, 64, 70, 84, 60, 96, 88, 74, 90][i], on ? C.fg : C.muted, on ? 0.75 : 0.35, 9);
}

// The column: heading and text across its full width.
rect(col.x, 52, 360, 22, { rx: 5, fill: C.fg, 'fill-opacity': 0.8 });
let y = prose(98, 3);
// Code, inset a tab each side.
y += 22;
card(inset.x, y, inset.w, 168);
rect(inset.x + 1, y + 1, inset.w - 2, 32, { rx: 11, fill: C.bg, 'fill-opacity': 0.5 });
bar(inset.x + 16, y + 12, 150, C.purple, 0.75); bar(inset.x + inset.w - 120, y + 12, 104, C.fg, 0.5);
for (let i = 0; i < 5; i++) { bar(inset.x + 16, y + 50 + i * 22, 18, C.neutral, 0.9); bar(inset.x + 48 + (i % 3) * 18, y + 50 + i * 22, [180, 260, 210, 300, 150][i], [C.pink, C.cyan, C.yellow, C.cyan, C.fg][i], 0.55); }
const code = { y, h: 168 };
y += 168 + 24;
y = prose(y, 2);
// A diagram figure as wide as its diagram, centred.
y += 22;
const fig = { w: 724, h: 230 }, fx = col.x + (col.w - fig.w) / 2;
card(fx, y, fig.w, fig.h);
for (let gx = fx + 18; gx < fx + fig.w - 8; gx += 24) for (let gy = y + 18; gy < y + fig.h - 40; gy += 24) rect(gx - 1, gy - 1, 2, 2, { rx: 1, fill: C.muted, 'fill-opacity': 0.4 });
rect(fx + 40, y + 28, 200, 130, { rx: 26, fill: 'none', stroke: C.cyan, 'stroke-width': 2 });
rect(fx + 300, y + 68, 130, 80, { rx: 22, fill: 'none', stroke: C.purple, 'stroke-width': 2 });
rect(fx + 334, y + 88, 62, 40, { rx: 8, fill: C.pink, 'fill-opacity': 0.14, stroke: C.pink, 'stroke-width': 2 });
rect(fx + 490, y + 34, 200, 140, { rx: 26, fill: 'none', stroke: C.yellow, 'stroke-width': 2 });
rect(fx + 1, y + fig.h - 36, fig.w - 2, 35, { fill: C.surface });
bar(fx + 16, y + fig.h - 22, 300, C.muted, 0.4, 8);
const figure = { x: fx, y, w: fig.w, h: fig.h };
y += fig.h + 24;
y = prose(y, 2);
// A narrow, tall diagram with its text beside it.
y += 22;
const nw = 300, nh = 300, gap = 36;
card(inset.x, y, nw, nh);
for (const [bx, by, bw] of [[60, 24, 180], [24, 104, 120], [156, 104, 120], [90, 184, 120], [70, 254, 160]]) rect(inset.x + bx, y + by, bw, 36, { rx: 10, fill: 'none', stroke: [C.neutral, C.cyan, C.yellow, C.purple, C.neutral][[24, 104, 104, 184, 254].indexOf(by) + (bx === 156 ? 1 : 0)], 'stroke-width': 1.6 });
const tx = inset.x + nw + gap;
for (let i = 0; i < 5; i++) { text(tx, y + 66 + i * 44, `${i + 1}.`, { fill: C.fg, 'font-size': 14 }); bar(tx + 22, y + 58 + i * 44, inset.x + inset.w - tx - 22 - (i % 2) * 120, C.fg, 0.22); bar(tx + 22, y + 74 + i * 44, 160 + i * 30, C.fg, 0.22); }
const beside = { y, h: nh };
y += nh + 28;
// Repo cards side by side, inset.
const cw = (inset.w - 32) / 3;
for (let i = 0; i < 3; i++) { const x = inset.x + i * (cw + 16); card(x, y, cw, 120); bar(x + 16, y + 18, 140, C.muted, 0.45); bar(x + 16, y + 40, 170, C.fg, 0.75, 11); bar(x + 16, y + 64, cw - 32, C.fg, 0.22); bar(x + 16, y + 92, 130, [C.yellow, C.cyan, C.purple][i], 0.45, 14); }
const cards = { y, h: 120 };

// Measurement bands and numbered tags.
const gapBand = (x1, y1, x2, y2) => {
  const v = x1 === x2, w = 10;
  const [x, yy, bw, bh] = v ? [x1 - w / 2, Math.min(y1, y2), w, Math.abs(y2 - y1)] : [Math.min(x1, x2), y1 - w / 2, Math.abs(x2 - x1), w];
  out.push(`<rect x="${x}" y="${yy}" width="${bw}" height="${bh}" fill="${C.mark}" fill-opacity="0.45"/>`);
  for (const e of v ? [[x, yy, x + bw, yy], [x, yy + bh, x + bw, yy + bh]] : [[x, yy, x, yy + bh], [x + bw, yy, x + bw, yy + bh]]) out.push(`<path d="M${e[0]} ${e[1]}L${e[2]} ${e[3]}" stroke="${C.mark}" stroke-width="1"/>`);
};
const tag = (n, value, x, yy, tx, ty) => {
  const w = 22 + (value ? 8 * String(value).length + 8 : 0);
  if (tx != null) out.push(`<path d="M${x} ${yy}L${tx} ${ty}" stroke="${C.mark}" stroke-width="1"/>`);
  out.push(`<rect x="${x - 11}" y="${yy - 11}" width="${w}" height="22" rx="11" fill="${C.bg}" stroke="${C.mark}" stroke-width="1"/>`);
  out.push(`<circle cx="${x}" cy="${yy}" r="9" fill="${C.mark}"/>`);
  out.push(`<text x="${x}" y="${yy + 4.5}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12.5" font-weight="700" fill="${C.bg}">${n}</text>`);
  if (value) out.push(`<text x="${x + 14}" y="${yy + 4.5}" font-family="Consolas, monospace" font-size="13" fill="${C.mark}">${value}</text>`);
};
// 1 · the column, across the top of the text.
gapBand(col.x, 30, col.x + col.w, 30); tag(1, '1040', col.x + col.w / 2 - 30, 30);
// 2 · the tab inset beside the code.
gapBand(col.x, code.y + code.h / 2, inset.x, code.y + code.h / 2); tag(2, '48', col.x - 2, code.y + code.h / 2 + 34, col.x + tab / 2, code.y + code.h / 2 + 5);
gapBand(inset.x + inset.w, code.y + code.h / 2, col.x + col.w, code.y + code.h / 2);
// 3 · the contents list stays clear of the column.
gapBand(168, 400, col.x, 400); tag(3, '32', 150, 432, 184, 405);
// 4 · the figure hugs its diagram, centred: equal space each side.
const fm = figure.y + figure.h / 2;
gapBand(col.x, fm, figure.x, fm); gapBand(figure.x + figure.w, fm, col.x + col.w, fm);
tag(4, `${figure.x - col.x} | ${figure.x - col.x}`, figure.x + figure.w / 2 - 50, figure.y - 14);
// 5 · the gap between a narrow diagram and its text.
gapBand(inset.x + nw, beside.y + beside.h - 22, tx, beside.y + beside.h - 22); tag(5, '36', inset.x + nw + 6, beside.y + beside.h + 14, inset.x + nw + gap / 2, beside.y + beside.h - 17);
// 6 · cards in an inset row.
tag(6, null, inset.x - 22, cards.y + cards.h / 2);

writeFileSync(new URL('../../svg/layout-anatomy.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out.join('')}</svg>`);
console.log('svg/layout-anatomy.svg', W, 'x', H);
