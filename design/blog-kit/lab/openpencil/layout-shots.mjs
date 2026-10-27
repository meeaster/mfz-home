// Captures the Article layout page's examples from a built article, at 2x, into design/blog-kit/layout/.
// Usage: node layout-shots.mjs <article.html>
// Each shot scrolls a target into view, takes a viewport screenshot (element screenshots come back blank)
// and crops it to the target's box.
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const page = resolve(process.argv[2]);
const out = new URL('../../layout/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const ab = (...args) => execFileSync('agent-browser', ['--session', 'layout-shots', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const scale = 2;

// [file, viewport w, viewport h, JS that prepares the page and returns the box to keep {x, y, w, h}]
const box = (from, to = from, pad = 16) => `(() => {
  const a = document.querySelector(${JSON.stringify(from)}), b = document.querySelector(${JSON.stringify(to)});
  a.scrollIntoView({ block: 'start' }); scrollBy(0, -${pad});
  const r = a.getBoundingClientRect(), s = b.getBoundingClientRect(), main = document.querySelector('main').getBoundingClientRect();
  const left = Math.min(main.left, r.left) - ${pad}, right = Math.max(main.right, s.right) + ${pad};
  return JSON.stringify({ x: Math.max(0, left), y: Math.max(0, r.top - ${pad}), w: Math.min(innerWidth, right) - Math.max(0, left), h: Math.min(innerHeight, s.bottom + ${pad}) - Math.max(0, r.top - ${pad}) });
})()`;
const shots = [
  // The whole desktop frame: contents list, text and an inset table, at the top of a section.
  ['desktop-frame.png', 1440, 900, `(() => { document.getElementById('needs').scrollIntoView(); scrollBy(0, -24); return JSON.stringify({ x: 0, y: 0, w: innerWidth, h: innerHeight }); })()`],
  ['repo-cards.png', 1440, 900, box('.cards')],
  ['sized-figure.png', 1440, 900, box('#need-1 .fig-card', '#need-1 figure.code .code-head')],
  ['terms-figure.png', 1440, 1000, box('#route .fig-card')],
  ['beside.png', 1440, 900, box('#order .beside')],
  ['file-index.png', 1440, 1000, `(() => { const g = document.querySelector('#files .fc-group'); g.scrollIntoView({ block: 'start' }); scrollBy(0, -16);
    const m = document.querySelector('main').getBoundingClientRect(), r = g.getBoundingClientRect();
    return JSON.stringify({ x: m.left - 8, y: r.top - 12, w: m.width + 16, h: innerHeight - r.top + 12 }); })()`],
  ['pills.png', 1440, 900, box('#first-run .table-wrap')],
  ['viewer.png', 1440, 900, `(async () => { document.querySelector('a[data-lines="13,16,20-21"]').click(); await new Promise((r) => setTimeout(r, 400));
    return JSON.stringify({ x: 0, y: 0, w: innerWidth, h: innerHeight }); })()`],
  ['phone-top.png', 390, 844, `(() => { scrollTo(0, 0); return JSON.stringify({ x: 0, y: 0, w: innerWidth, h: innerHeight }); })()`],
  ['phone-terms.png', 390, 844, `(() => { document.querySelector('#route .fig-card').scrollIntoView(); return JSON.stringify({ x: 0, y: 0, w: innerWidth, h: innerHeight }); })()`],
  ['phone-viewer.png', 390, 844, `(async () => { document.querySelector('a[data-lines="261"]').click(); await new Promise((r) => setTimeout(r, 400));
    return JSON.stringify({ x: 0, y: 0, w: innerWidth, h: innerHeight }); })()`],
];

const tmp = `${out}.tmp.png`;
for (const [file, w, h, js] of shots) {
  ab('set', 'viewport', String(w), String(h), String(scale));
  ab('open', `file://${page}`);
  ab('eval', 'document.fonts.ready.then(() => 1)');
  const raw = JSON.parse(ab('eval', js));
  const r = JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
  ab('screenshot', tmp);
  const geo = `${Math.round(r.w * scale)}x${Math.round(r.h * scale)}+${Math.round(r.x * scale)}+${Math.round(r.y * scale)}`;
  execFileSync('magick', [tmp, '-crop', geo, '+repage', '-background', '#282a36', '-flatten', `${out}${file}`]);
  console.log(file, geo);
}
if (existsSync(tmp)) execFileSync('rm', [tmp]);
ab('close');
