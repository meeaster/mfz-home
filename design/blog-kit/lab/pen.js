// Inline at the end of the page. Redraws each diagram (a Pele SVG in a .fig) by hand, in the reader's browser:
// lines and outlines become stroked paths that wander like a hand, lightly on boxes and lines, more on group
// loops, which run a little past where they begin; the focus fill (a tint of its outline's colour) becomes
// hatching under its text. Text and icons are untouched. Without JavaScript the page keeps the clean diagram.
// Colours come from computed style, so the pen redraws when the colour scheme or a data-theme attribute
// changes. data-pen="all" on a .fig also hatches every plain box; data-pen="off" leaves it alone.
// window.pen: draw(), undo() (back to the clean diagrams, as overlap-check.js does while it measures), redraw().
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const f1 = (n) => Math.round(n * 10) / 10;

  const hash = (s) => {
    let h = 2166136261;

    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);

    return h >>> 0;
  };

  // A seeded generator, so the same diagram is drawn the same way on every load.
  const rng = (seed) => {
    let a = hash(seed);

    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Computed colours can come back as color(srgb …) from color-mix, which a canvas passes through unchanged;
  // painting one pixel and reading it back gives plain #rrggbb.
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  const hex = (c) => {
    if (!c || c === 'none' || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);

    return '#' + [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  const distance = (a, b) => {
    const p = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const q = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));

    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  };

  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);

    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);

    return e;
  };

  // The outline of a shape as path data, one entry per subpath.
  const geometry = (g, cs) => {
    const t = g.tagName;
    const n = (a) => g[a].baseVal.value;

    if (t === 'rect') {
      const x = n('x'), y = n('y'), w = n('width'), h = n('height');
      let rx = parseFloat(cs.rx), ry = parseFloat(cs.ry);

      if (isNaN(rx)) rx = isNaN(ry) ? 0 : ry;

      if (isNaN(ry)) ry = rx;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);

      return [{ closed: true, d: `M${x + rx},${y}H${x + w - rx}A${rx},${ry} 0 0 1 ${x + w},${y + ry}V${y + h - ry}A${rx},${ry} 0 0 1 ${x + w - rx},${y + h}H${x + rx}A${rx},${ry} 0 0 1 ${x},${y + h - ry}V${y + ry}A${rx},${ry} 0 0 1 ${x + rx},${y}Z` }];
    }

    if (t === 'circle' || t === 'ellipse') {
      const cx = n('cx'), cy = n('cy'), rx = t === 'circle' ? n('r') : n('rx'), ry = t === 'circle' ? n('r') : n('ry');

      return [{ closed: true, d: `M${cx + rx},${cy}A${rx},${ry} 0 1 1 ${cx - rx},${cy}A${rx},${ry} 0 1 1 ${cx + rx},${cy}Z` }];
    }

    if (t === 'line') return [{ closed: false, d: `M${n('x1')},${n('y1')}L${n('x2')},${n('y2')}` }];

    if (t === 'polygon' || t === 'polyline') {
      const points = g.getAttribute('points').trim().replace(/\s+/g, ' ').split(' ');

      return [{ closed: t === 'polygon', d: 'M' + points.join('L') + (t === 'polygon' ? 'Z' : '') }];
    }

    const d = g.getAttribute('d') || '';

    // Relative subpaths can't be split without resolving them; such a shape keeps its clean outline.
    if (/m/.test(d.replace(/^\s*m/, 'M'))) return null;

    return d.split(/(?=M)/).filter((s) => s.trim()).map((s) => ({ closed: /z\s*$/i.test(s), d: s }));
  };

  // A hand's path: a slow bow plus a faster wobble and a little tremor, perpendicular to the line.
  const wander = (R, amp) => {
    const waves = [[1, 140 + R() * 140], [0.35, 45 + R() * 40], [0.08, 8 + R() * 4]].map(([a, l]) => [a, l, R() * 6.283]);

    return (s) => amp * waves.reduce((t, [a, l, p]) => t + a * Math.sin((6.283 * s) / l + p), 0);
  };

  // Moves each point of a polyline along its normal by off(s), s being the distance along the line.
  const offset = (pts, off) => {
    let s = 0;

    return pts.map((p, i) => {
      if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
      const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, o = off(s);

      return [p[0] - (dy / m) * o, p[1] + (dx / m) * o];
    });
  };

  const smooth = (pts) => pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p
    : [(pts[i - 1][0] + 2 * p[0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * p[1] + pts[i + 1][1]) / 4]));

  const polyline = (pts) => 'M' + pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L');

  // Where the line o + u·a lies inside a polygon: the a-intervals between its crossings with the edges.
  const inside = (poly, o, u) => {
    const hits = [];

    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], ex = q[0] - p[0], ey = q[1] - p[1];
      const den = u[0] * ey - u[1] * ex;

      if (Math.abs(den) < 1e-9) continue;
      const wx = p[0] - o[0], wy = p[1] - o[1], t = (wx * u[1] - wy * u[0]) / den;

      if (t >= 0 && t < 1) hits.push((wx * ey - wy * ex) / den);
    }

    hits.sort((x, y) => x - y);
    const out = [];

    for (let i = 0; i + 1 < hits.length; i += 2) out.push([hits[i], hits[i + 1]]);

    return out;
  };

  // Light parallel strokes across a closed outline, each stopping 1–3px short of it, like colouring in.
  const hatching = (poly, R, gap) => {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
    const u = [Math.cos(-0.66), Math.sin(-0.66)], d = [];

    for (let t = -span / 2; t < span / 2; t += gap + (R() - 0.5) * 0.8) {
      const o = [cx - u[1] * t, cy + u[0] * t];

      for (const [a0, e0] of inside(poly, o, u)) {
        const a = a0 + 1 + R() * 2, e = e0 - 1 - R() * 2;

        if (e - a < 3) continue;
        const bow = (R() - 0.5) * 1.4, m = (a + e) / 2;
        d.push(`M${f1(o[0] + u[0] * a)},${f1(o[1] + u[1] * a)}Q${f1(o[0] + u[0] * m - u[1] * bow)},${f1(o[1] + u[1] * m + u[0] * bow)} ${f1(o[0] + u[0] * e)},${f1(o[1] + u[1] * e)}`);
      }
    }

    return d.join('');
  };

  const drawSvg = (svg, seed, hatchAll) => {
    const bg = hex(getComputedStyle(svg).getPropertyValue('--pele-bg').trim()) || hex(getComputedStyle(svg).backgroundColor);
    const probe = el('path', { d: '' });
    svg.appendChild(probe);

    const sample = (d, step) => {
      probe.setAttribute('d', d);
      const L = probe.getTotalLength(), n = Math.max(2, Math.ceil(L / step)), out = [];

      for (let i = 0; i <= n; i++) {
        const p = probe.getPointAtLength((L * i) / n);
        out.push([p.x, p.y]);
      }

      return out;
    };

    const marks = [...svg.querySelectorAll('path, rect, polygon, polyline, line, circle, ellipse')].filter((g) => g !== probe
      && g.ownerSVGElement === svg && !g.closest('defs, marker, clipPath, mask, pattern, symbol, .pele-icon, .pele-icon-tile')
      && g.getClientRects().length);

    let k = 0;

    for (const g of marks) {
      const cs = getComputedStyle(g), R = rng(`${seed}:${k++}`), parts = geometry(g, cs);

      if (!parts) continue;
      const stroke = hex(cs.stroke), fill = hex(cs.fill), sw = parseFloat(cs.strokeWidth) || 1;
      const so = +cs.strokeOpacity * +cs.opacity, fo = +cs.fillOpacity * +cs.opacity;
      const box = g.getBBox(), small = Math.max(box.width, box.height) < 24;

      // A shape the stylesheet roughens with a filter is a group loop: it wanders most and closes past its start.
      const loop = cs.filter !== 'none';
      const out = el('g', { class: `pen ${g.getAttribute('class') || ''}` });

      if (g.getAttribute('transform')) out.setAttribute('transform', g.getAttribute('transform'));

      // Inline styles: the page's rules for Pele classes would otherwise restyle what's drawn here.
      const add = (d, style) => d && out.appendChild(el('path', { d, style }));

      for (const part of parts) {
        const base = sample(part.d, small ? 1.2 : 2.5);

        // Fill first. The paper colour stays exact so the grid doesn't show through; a tint of the outline's
        // colour (the focus) becomes hatching, and so does a plain box under data-pen="all".
        if (fill && fo > 0 && part.closed) {
          const tint = stroke && fill !== stroke && bg && distance(fill, bg) < 70 && distance(fill, bg) > 4;
          const plain = hatchAll && fill === bg && stroke && so > 0 && !small;

          if (fill === bg || tint) add(part.d, `fill:${bg};stroke:none`);

          if (tint || plain) add(hatching(base.slice(0, -1), R, tint ? 4 : 4.6), `fill:none;stroke:${stroke};stroke-opacity:${(tint ? 0.55 : 0.3) * so};stroke-width:${tint ? 1 : 0.9};stroke-linecap:round`);

          if (fill !== bg && !tint) {
            const wob = wander(R, small ? 0.2 : 0.5);
            add(polyline(offset(base, wob)) + 'Z', `fill:${fill};fill-opacity:${fo};stroke:none`);
          }
        }

        if (!stroke || so === 0 || cs.strokeWidth === '0px') continue;

        // The pen. A loop starts somewhere along its outline and runs 5–10px past where it began, easing a
        // little off its start like a lifted pen; any other closed outline meets its start exactly.
        const dash = cs.strokeDasharray === 'none' ? null : cs.strokeDasharray;
        const closes = part.closed && !dash && loop;
        const overLen = 5 + R() * 5;
        let pts = base;

        if (closes) {
          const n = base.length - 1, start = Math.floor(R() * n);
          pts = [];

          for (let i = 0; i <= n + Math.ceil(overLen / 2.5); i++) pts.push(base[(start + i) % n]);
        }

        const total = pts.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
        const wob = wander(R, (small ? 0.1 : loop ? 1.6 : 0.45) * Math.min(1, total / 70));
        const drift = closes ? (R() < 0.5 ? -1 : 1) * 0.5 : 0;

        const ease = (s) => {
          const t = closes ? Math.max(0, (s - (total - overLen)) / overLen) : 0;

          return t * t * (3 - 2 * t);
        };

        const seam = part.closed && !closes ? wob(total) - wob(0) : 0;
        const line = offset(part.closed && !closes ? pts : smooth(smooth(pts)), (s) => wob(s) + drift * ease(s) - (seam * s) / total);
        add(polyline(line) + (part.closed && !closes ? 'Z' : ''), `fill:none;stroke:${stroke};stroke-opacity:${so};stroke-width:${sw};stroke-linecap:round;stroke-linejoin:round${dash ? `;stroke-dasharray:${dash}` : ''}`);
      }

      g.replaceWith(out);
    }

    probe.remove();
  };

  // Each drawn figure keeps its clean SVG, to restore for undo() and to redraw from when colours change.
  const clean = new Map();
  const figures = () => [...document.querySelectorAll('.fig')].filter((f) => f.dataset.pen !== 'off' && f.querySelector('svg.pele'));

  const pen = {
    active: false,
    draw() {
      figures().forEach((f, i) => {
        const svg = f.querySelector('svg.pele');
        clean.set(f, svg.cloneNode(true));
        drawSvg(svg, f.id || `fig-${i}`, f.dataset.pen === 'all');
      });
      pen.active = true;
    },
    undo() {
      for (const [f, svg] of clean) f.querySelector('svg.pele').replaceWith(svg.cloneNode(true));
      clean.clear();
      pen.active = false;
    },
    redraw() {
      if (pen.active) pen.undo();
      pen.draw();
    },
  };

  window.pen = pen;
  pen.draw();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pen.redraw);
  new MutationObserver(pen.redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
})();
