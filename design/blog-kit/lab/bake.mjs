// Bakes the page-CSS house style into self-contained SVGs that OpenPencil can import.
// Usage: node bake.mjs <page.html> <out-dir> <figure-id>[@<width>[x<height>]]...
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [page, outDir, ...ids] = process.argv.slice(2);
const ab = (...args) => execFileSync('agent-browser', ['--session', 'bake', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
// The agent-browser daemon drops the first command after a previous run closed the browser; retry it.
for (let attempt = 1; ; attempt++) {
  try { ab('open', 'file://' + resolve(page)); break; } catch (e) { if (attempt === 3) throw e; }
}
ab('eval', 'document.fonts.ready.then(() => 1)');
mkdirSync(outDir, { recursive: true });

const bake = (id, aspect) => {
    const fig = document.getElementById(id);
    const src = fig.querySelector('svg');
    const out = src.cloneNode(true);

    // Chrome reports color-mix() results in forms design tools don't parse, so read colours back through a canvas.
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const toHex = (c) => {
      if (!c || c === 'none' || c.startsWith('url')) return [c, 1];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) return ['none', 1];
      return ['#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''), +(a / 255).toFixed(3)];
    };

    const props = ['stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-anchor', 'dominant-baseline'];
    const a = [src, ...src.querySelectorAll('*')];
    const b = [out, ...out.querySelectorAll('*')];
    const drop = [];
    const loops = [];
    a.forEach((el, i) => {
      const o = b[i];
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return drop.push(o);
      for (const p of ['fill', 'stroke']) {
        const [hex, alpha] = toHex(cs.getPropertyValue(p));
        o.setAttribute(p, hex);
        const own = +cs.getPropertyValue(p + '-opacity');
        if (alpha * own < 1) o.setAttribute(p + '-opacity', +(alpha * own).toFixed(3));
      }
      for (const p of props) {
        const v = cs.getPropertyValue(p);
        if (v && v !== 'normal' && v !== 'none' && v !== 'auto') o.setAttribute(p, v);
      }
      // OpenPencil's SVG import drops dashes; name the layer after its pattern so place.mjs can restore it after import.
      if (o.hasAttribute('stroke-dasharray')) {
        const dash = o.getAttribute('stroke-dasharray').replace(/px/g, '').split(/[\s,]+/).filter(Boolean);
        o.setAttribute('stroke-dasharray', dash.join(' '));
        if (/^(path|line|polyline|rect|circle|ellipse|polygon)$/.test(el.tagName)) o.setAttribute('id', `dash_${dash.join('_')}_${i}`);
      }
      if (el.tagName === 'rect' && cs.rx !== 'auto') o.setAttribute('rx', parseFloat(cs.rx));
      if (cs.filter.startsWith('url') && el.tagName === 'rect') loops.push(o);
      if (cs.textTransform === 'lowercase' && (el.tagName === 'text' || el.tagName === 'tspan'))
        for (const n of o.childNodes) if (n.nodeType === 3) n.data = n.data.toLowerCase();
      o.removeAttribute('style');
      // A shape with neither fill nor stroke draws nothing, but the importer gives it a black fill.
      if (/^(rect|path|circle|ellipse|polygon|polyline|line)$/.test(el.tagName) && o.getAttribute('fill') === 'none' && o.getAttribute('stroke') === 'none') drop.push(o);
    });
    drop.forEach((o) => o.remove());
    out.querySelectorAll('style').forEach((s) => s.remove());
    const NS = 'http://www.w3.org/2000/svg';

    // Design tools drop SVG filters, so the #lasso wobble (turbulence + displacement) becomes real geometry:
    // walk the rounded rectangle's outline and displace each point by smooth, seeded noise of its position.
    const wave = (seed) => [[0.011, 2.1], [0.023, 1.2], [0.047, 0.5]].map(([f, amp], k) => [f, amp, seed * 7.3 + k * 2.9]);
    const nx = wave(1), ny = wave(2);
    const noise = (terms, x, y) => terms.reduce((s, [f, amp, ph]) => s + amp * Math.sin(x * f + ph) * Math.cos(y * f * 1.3 + ph * 0.7), 0);
    for (const o of loops) {
      const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => +o.getAttribute(k) || 0);
      const r = Math.min(+o.getAttribute('rx') || 0, w / 2, h / 2);
      const pts = [];
      const edge = (x1, y1, x2, y2) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 5)); for (let i = 0; i < n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); };
      const arc = (cx, cy, a0) => { for (let i = 0; i < 8; i++) { const t = a0 + (Math.PI / 2) * i / 8; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); } };
      edge(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2);
      edge(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0);
      edge(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2);
      edge(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI);
      const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${(px + noise(nx, px, py)).toFixed(1)} ${(py + noise(ny, px, py)).toFixed(1)}`).join('') + 'Z';
      const p = document.createElementNS(NS, 'path');
      for (const at of o.attributes) if (!['x', 'y', 'width', 'height', 'rx', 'ry', 'filter', 'class'].includes(at.name)) p.setAttribute(at.name, at.value);
      p.setAttribute('d', d);
      p.setAttribute('stroke-linejoin', 'round');
      o.replaceWith(p);
    }

    // Icons are nested <svg> viewports, which the importer places without their own x/y/viewBox scaling.
    // Replace each with a group carrying the equivalent transform (preserveAspectRatio xMidYMid meet).
    for (const inner of [...out.querySelectorAll('svg')].reverse()) {
      const [vx, vy, vw, vh] = (inner.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
      const [x, y] = ['x', 'y'].map((k) => +inner.getAttribute(k) || 0);
      const w = +inner.getAttribute('width') || vw, h = +inner.getAttribute('height') || vh;
      const s = vw ? Math.min(w / vw, h / vh) : 1;
      const tx = x + (vw ? (w - vw * s) / 2 - vx * s : 0), ty = y + (vh ? (h - vh * s) / 2 - vy * s : 0);
      const g = document.createElementNS(NS, 'g');
      for (const at of inner.attributes) if (!['x', 'y', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns'].includes(at.name)) g.setAttribute(at.name, at.value);
      g.setAttribute('transform', `translate(${+tx.toFixed(3)} ${+ty.toFixed(3)}) scale(${+s.toFixed(5)})`);
      g.append(...inner.childNodes);
      inner.replaceWith(g);
    }

    // Paper: a CSS background on the figure, so draw it as dots or lines behind the diagram.
    // With a target aspect (id@WxH), the paper grows to that shape with the diagram centred, matching a fixed slot.
    // With a width only (id@W), see below.
    const [x0, y0, w, h] = out.getAttribute('viewBox').split(/\s+/).map(Number);
    const pad = 14;
    let [bx, by, bw, bh] = [x0 - pad, y0 - pad, w + 2 * pad, h + 2 * pad];
    // id@W (no height): widen the paper to W at full scale, so the diagram keeps its real size in a W-wide slot.
    if (aspect?.length === 1) { if (bw < aspect[0]) { bx -= (aspect[0] - bw) / 2; bw = aspect[0]; } }
    else if (aspect) {
      const want = aspect[0] / aspect[1];
      if (bw / bh < want) { const nw = bh * want; bx -= (nw - bw) / 2; bw = nw; }
      else { const nh = bw / want; by -= (nh - bh) / 2; bh = nh; }
    }
    const paper = document.createElementNS(NS, 'g');
    paper.setAttribute('id', 'paper');
    const add = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); paper.append(e); };
    const bg = getComputedStyle(fig);
    add('rect', { x: bx, y: by, width: bw, height: bh, rx: 10, fill: toHex(bg.backgroundColor)[0] });
    // The paper's kind and spacing come from the figure's background: dots (a radial gradient), a grid (linear
    // gradients) or plain, every background-size px.
    const dots = bg.backgroundImage.includes('radial-gradient'), plain = bg.backgroundImage === 'none';
    const [line, lineA] = toHex(dots ? 'color-mix(in srgb, #a3a8c3 32%, transparent)' : 'color-mix(in srgb, #a3a8c3 11%, transparent)');
    const step = parseFloat(bg.backgroundSize) || (dots ? 24 : 16);
    // Dots go in as one path of small circles: one node in the design file instead of hundreds.
    if (dots) {
      let d = '';
      for (let x = bx; x <= bx + bw; x += step) for (let y = by; y <= by + bh; y += step) d += `M${x - 1},${y}a1,1 0 1,0 2,0a1,1 0 1,0 -2,0`;
      add('path', { d, fill: line, 'fill-opacity': lineA });
    } else if (!plain) for (let x = bx; x <= bx + bw; x += step)
      add('line', { x1: x, y1: by, x2: x, y2: by + bh, stroke: line, 'stroke-opacity': lineA, 'stroke-width': 1 });
    if (!dots && !plain) for (let y = by; y <= by + bh; y += step)
      add('line', { x1: bx, y1: y, x2: bx + bw, y2: y, stroke: line, 'stroke-opacity': lineA, 'stroke-width': 1 });
    out.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`);
    out.setAttribute('width', bw);
    out.setAttribute('height', bh);
    out.prepend(paper);
    return new XMLSerializer().serializeToString(out);
  };

for (const spec of ids) {
  const [id, size] = spec.split('@');
  const aspect = size ? size.split('x').map(Number) : null;
  const { data } = JSON.parse(execFileSync('agent-browser', ['--session', 'bake', '--json', 'eval', '--stdin'],
    { input: `(${bake})(${JSON.stringify(id)}, ${JSON.stringify(aspect)})`, encoding: 'utf8', maxBuffer: 64 << 20 }));
  const svg = data.result;
  writeFileSync(`${outDir}/${id}.svg`, svg);
  console.log(id, svg.length);
}
ab('close');
