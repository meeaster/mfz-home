// Post-render fixes for Pele SVG: things the layout gets wrong that CSS can't
// move (frame padding, self-message labels) and brand icons Pele doesn't bundle.
import { readFile } from 'node:fs/promises';

const packs = {};
async function icon(name) {
  // Plain names (cloud, server, disk) are Pele's own glyphs; only pack:name icons are swapped.
  if (!name.includes(':')) return null;
  const [prefix, id] = name.split(':');
  packs[prefix] ??= JSON.parse(await readFile(new URL(`./node_modules/@iconify-json/${prefix}/icons.json`, import.meta.url)));
  const pack = packs[prefix];
  const found = pack.icons[id] ?? pack.icons[pack.aliases?.[id]?.parent];
  if (!found) return null;
  return { body: found.body, width: found.width ?? pack.width ?? 24, height: found.height ?? pack.height ?? 24 };
}

// Pele keeps the requested icon name in data-icon but draws a generic glyph.
export async function swapIcons(svg) {
  const re = /<svg class="pele-icon" data-icon="([^"]+)"([^>]*)>[\s\S]*?<\/svg>/g;
  let out = '', last = 0;
  for (const m of svg.matchAll(re)) {
    const found = await icon(m[1]);
    out += svg.slice(last, m.index);
    if (found) {
      const keep = m[2].replace(/ (viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/g, '');
      out += `<svg class="pele-icon pele-brand" data-icon="${m[1]}"${keep} viewBox="0 0 ${found.width} ${found.height}">${found.body}</svg>`;
    } else out += m[0];
    last = m.index + m[0].length;
  }
  return out + svg.slice(last);
}

// Sequence frames are drawn flush against their messages; grow the outer rect.
// The top only grows into free space, so it never runs into the message above.
export function padFrames(svg, px = 12, py = 8, gap = 8) {
  const above = [];
  for (const m of svg.matchAll(/<g class="pele-edge pele-message"[^>]*>\s*<path d="([^"]+)"/g))
    for (const p of m[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) above.push([+p[1], +p[2]]);
  for (const m of svg.matchAll(/<g class="pele-edge-label"[^>]*>\s*<text x="([\d.]+)" y="([\d.]+)"/g)) above.push([+m[1], +m[2] + 4]);
  const grown = [];
  // Frames entirely above a frame and overlapping it horizontally: their grown bottom edges are obstacles,
  // so a par and the alt right after it don't grow into each other.
  const frames = [...svg.matchAll(/<g class="pele-frame[^"]*">\s*<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  const out = svg.replace(/(<g class="pele-frame[^"]*">)([\s\S]*?)(<\/g>)/g, (_, open, body, close) => {
    const m = body.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    if (!m) return open + body + close;
    const [x, y, w, h] = m.slice(1).map(Number);
    const frameBottoms = frames.filter(([fx, fy, fw, fh]) => fy + fh <= y && fx < x + w + px && fx + fw > x - px).map(([, fy, , fh]) => fy + fh + py);
    const prev = Math.max(-Infinity, ...frameBottoms, ...above.filter(([ax, ay]) => ax >= x - px && ax <= x + w + px && ay < y).map(([, ay]) => ay));
    const top = Math.max(0, Math.min(py, y - prev - gap));
    // Whatever the top could not grow, the frame tag moves down instead, so it keeps its padding.
    const shift = py - top;
    body = body.replace(m[0], `<rect x="${x - px}" y="${y - top}" width="${w + 2 * px}" height="${h + top + py}"`);
    grown.push([x - px, y - top, w + 2 * px, h + top + py]);
    body = body.replace(/(<text class="pele-frame-(?:kind|label)"[^>]*?) y="([\d.]+)"/g, (t, head, ty) => `${head} y="${+ty + shift}"`);
    return open + body + close;
  });
  return fitViewBox(out, grown);
}

// A self-message's label is centred over its own loop; move it to the right of the loop.
export function selfMessageLabels(svg, gap = 10) {
  const loops = {};
  for (const m of svg.matchAll(/<g class="pele-edge pele-message" data-id="([^"]+)">\s*<path d="([^"]+)"/g)) {
    const xs = [...m[2].matchAll(/[MLHA]?(-?[\d.]+),(-?[\d.]+)/g)].map((p) => +p[1]);
    if (/A/.test(m[2])) loops[m[1]] = Math.max(...xs);
  }
  return svg.replace(/(<g class="pele-edge-label" data-id="([^"]+)">\s*<text) x="[\d.]+"([^>]*?) text-anchor="middle"/g,
    (all, head, id, rest) => (id in loops ? `${head} x="${loops[id] + gap}"${rest} text-anchor="start"` : all));
}

// Knockout logos (the mark is the negative space inside a solid shape) read wrong
// drawn light-on-dark; draw them dark inside a light tile instead.
export const knockout = new Set(["simple-icons:datadog"]);
export function invertKnockouts(svg) {
  return svg.replace(/<svg class="pele-icon pele-brand" data-icon="([^"]+)" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g, (all, name, x, y, w, h) =>
    knockout.has(name) ? `<rect class="pele-icon-tile" x="${+x - 3}" y="${+y - 3}" width="${+w + 6}" height="${+h + 6}" rx="6"/>${all.replace("pele-brand", "pele-brand pele-knockout")}` : all);
}

// Pele centres group labels at the top, which is where lines usually enter a group.
// Put each label in the widest stretch of a band no line crosses: the top band first,
// then a band added along the bottom, and only then just outside the top-left corner,
// where a label reads as detached. Pele draws a label that a line crosses in a separate
// pele-cluster-title overlay with a halo copy; every text of a label moves together.
// Width is estimated for Kalam, the group-label font (about 0.45em a character).
export function clusterLabelsClear(svg, { inset = 14, band = 30, gap = 10, fontSize = 17, charW = 0.46, widen = 80 } = {}) {
  const points = [];
  for (const m of svg.matchAll(/<g class="pele-edge[^"]*"[^>]*>([\s\S]*?)<\/g>/g))
    for (const d of m[1].matchAll(/<path d="([^"]+)"/g)) {
      const pts = [...d[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((p) => [+p[1], +p[2]]);
      for (let i = 1; i < pts.length; i++) for (let t = 0; t <= 1; t += 0.05)
        points.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
    }
  // Edge labels are obstacles too: sample each label's chip so a band never runs through one.
  for (const m of svg.matchAll(/<g class="pele-edge-label"[^>]*>\s*<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    const [x, y, w, h] = m.slice(1).map(Number);
    for (let px = x; px <= x + w; px += 4) for (const py of [y, y + h / 2, y + h]) points.push([px, py]);
  }
  const rects = Object.fromEntries([...svg.matchAll(/<g class="pele-cluster[^"]*" data-id="([^"]+)">\s*<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [m[1], m.slice(2).map(Number)]));
  // The widest stretch of a band across the group that no line crosses, if the label fits in it.
  const stretch = ([rx, , rw], y0, y1, need) => {
    const xs = points.filter(([x, y]) => y >= y0 && y <= y1 && x > rx && x < rx + rw).map(([x]) => x).sort((p, q) => p - q);
    const edges = [rx + inset - gap, ...xs, rx + rw - inset + gap];
    let best = null;
    for (let i = 1; i < edges.length; i++) if (edges[i] - edges[i - 1] >= need && (!best || edges[i] - edges[i - 1] > best[1] - best[0])) best = [edges[i - 1], edges[i]];
    return best;
  };
  // Where a label goes, in order: the top band; else a band added along the bottom (the group
  // grows to make it, and widens evenly by up to `widen` when the label is longer than the group
  // and no line crosses the bottom); else just outside the top-left corner. A group icon moves with its label.
  const extents = [];
  const place = (texts, rect, icon = '', canGrow = false) => {
    const [rx, ry, rw, rh] = rect;
    const label = texts.match(/<text class="pele-cluster-label"[^>]*>([^<]*)</)?.[1];
    if (!label) return { body: icon + texts, grow: 0, widenBy: 0 };
    const iconW = +(icon.match(/ width="([\d.]+)"/)?.[1] ?? 0), lead = iconW ? iconW + 6 : 0;
    const labelW = label.length * fontSize * charW;
    const need = labelW + lead + gap * 2;
    let best = stretch(rect, ry - 2, ry + band, need), dy = 0, grow = 0, widenBy = 0;
    if (!best && canGrow) {
      best = stretch(rect, ry + rh - 2, ry + rh + band, need);
      const short = need - (rw - 2 * inset + 2 * gap);
      const crossed = points.some(([px, py]) => py >= ry + rh - 2 && py <= ry + rh + band && px > rx && px < rx + rw);
      if (!best && short > 0 && short <= widen && !crossed) { widenBy = short; best = [rx - short / 2 + inset - gap, rx + rw + short / 2 - inset + gap]; }
      // The band is as deep as the label sits below the group's top, plus room for descenders and the 4px clearance.
      const depth = Math.max(band, +(texts.match(/<text class="pele-cluster-label"[^>]*? y="([-\d.]+)"/)?.[1] ?? ry + band - 8) - ry + 15);
      if (best) { dy = rh; grow = depth; extents.push([rx - widenBy / 2, ry, rw + widenBy, rh + depth + gap]); }
    }
    const [x, anchor] = best ? [best[0] + gap + lead, 'start'] : [rx - gap, 'end'];
    const iconX = best ? best[0] + gap : rx - gap - labelW - lead;
    if (!best) extents.push([iconX - gap, ry, labelW + lead + gap, band]);
    const shift = (s) => (dy ? s.replace(/ y="([-\d.]+)"/g, (_, v) => ` y="${+(+v + dy).toFixed(2)}"`) : s);
    return {
      body: shift(icon.replace(/ x="[-\d.]+"/, ` x="${+iconX.toFixed(2)}"`)) + shift(texts.replace(/(<text[^>]*?) x="[-\d.]+"([^>]*?) text-anchor="middle"/g, `$1 x="${x}"$2 text-anchor="${anchor}"`)),
      grow, widenBy,
    };
  };
  const out = svg
    .replace(/(<g class="pele-cluster[^"]*" data-id="([^"]+)">\s*<rect[^>]*>(?:\s*<path[^>]*\/>)?)(\s*<svg class="pele-icon"[^>]*>[\s\S]*?<\/svg>)?((?:\s*<text[^>]*>[^<]*<\/text>)+)/g, (_, head, id, icon = '', texts) => {
      const { body, grow, widenBy } = place(texts, rects[id], icon, true);
      let h2 = grow ? head.replace(/ height="([\d.]+)"/, (_, h) => ` height="${+h + grow}"`) : head;
      if (widenBy) h2 = h2.replace(/ x="([-\d.]+)"/, (_, v) => ` x="${+(+v - widenBy / 2).toFixed(2)}"`).replace(/ width="([\d.]+)"/, (_, v) => ` width="${+(+v + widenBy).toFixed(2)}"`);
      return h2 + body;
    })
    .replace(/(<g class="pele-cluster-title" data-id="([^"]+)">)((?:\s*<text[^>]*>[^<]*<\/text>)+)/g, (all, head, id, texts) => (rects[id] ? head + place(texts, rects[id]).body : all));
  // A group grown downward can cross the outline of a group around it: grow that one too, outwards.
  let nested = out;
  for (let pass = 0; pass < 4; pass++) {
    const all = [...nested.matchAll(/<g class="pele-cluster[^"]*" data-id="([^"]+)">\s*<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [m[1], ...m.slice(2).map(Number)]);
    let changed = false;
    for (const [pid, px, py, pw, ph] of all) {
      const need = Math.max(py + ph, ...all.filter(([cid, cx, cy, cw, ch]) => cid !== pid && cx >= px - 0.5 && cx + cw <= px + pw + 0.5 && cy > py && cy < py + ph).map(([, , cy, , ch]) => cy + ch + 8));
      if (need > py + ph + 0.5) {
        nested = nested.replace(new RegExp(`(<g class="pele-cluster[^"]*" data-id="${pid}">\\s*<rect x="[-\\d.]+" y="[-\\d.]+" width="[\\d.]+") height="[\\d.]+"`), `$1 height="${+(need - py).toFixed(2)}"`);
        extents.push([px, py, pw, need - py]);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // A label outside its group, or a group grown downward, can pass the drawing's edge.
  return fitViewBox(nested, extents);
}

// Pele draws some types (sequence, architecture) inside a root <g transform="translate(…)">,
// so element coordinates are offset from the viewBox. Grow the viewBox to contain boxes given in
// those element coordinates ([x, y, w, h]), adding the root offset.
export function fitViewBox(svg, boxes, margin = 0) {
  if (!boxes.length) return svg;
  const [tx, ty] = (svg.match(/<g transform="translate\(([-\d.]+),([-\d.]+)\)">/)?.slice(1) ?? [0, 0]).map(Number);
  return svg.replace(/<svg([^>]*?) viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)" width="([\d.]+)" height="([\d.]+)"/, (all, pre, vx, vy, vw, vh) => {
    let [x0, y0, x1, y1] = [+vx, +vy, +vx + +vw, +vy + +vh];
    for (const [x, y, w, h] of boxes) [x0, y0, x1, y1] = [Math.min(x0, x + tx - margin), Math.min(y0, y + ty - margin), Math.max(x1, x + w + tx + margin), Math.max(y1, y + h + ty + margin)];
    if (x0 === +vx && y0 === +vy && x1 === +vx + +vw && y1 === +vy + +vh) return all;
    const f = (v) => +v.toFixed(2);
    return `<svg${pre} viewBox="${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"`;
  });
}

// The hand-drawn loop displaces a group's outline by up to about 8px; keep `room` around every
// group and frame inside the drawing so loops at its edge aren't clipped.
export function loopRoom(svg, room = 10) {
  const boxes = [...svg.matchAll(/<g class="pele-(?:cluster|frame)[^"]*"(?: data-id="[^"]*")?>\s*<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  return fitViewBox(svg, boxes, room);
}

// A frame's title is centred where it can run into the tag pill, and labels on a background chip
// (a title Pele chips, an else label) sit on a chip sized for Arial, which Kalam overflows. Start each
// title `gap` after its pill, and each else label inside the frame, on chips widened for Kalam.
export function frameLabels(svg, { gap = 6, fontSize = 17, charW = 0.46 } = {}) {
  const chipW = (label) => +(label.length * fontSize * charW + 8).toFixed(2);
  return svg.replace(/(<g class="pele-frame[^"]*">)([\s\S]*?)(<\/g>)/g, (_, open, body, close) => {
    const frameX = +(body.match(/<rect x="([-\d.]+)" y="[-\d.]+" width="[\d.]+"/)?.[1] ?? NaN);
    const pill = body.match(/<rect x="([-\d.]+)" y="[-\d.]+" width="([\d.]+)" height="[\d.]+"[^>]*\/>\s*<text class="pele-frame-kind"/);
    // The title follows the tag, sometimes on its own chip (when a divider of an enclosing frame could cross it).
    if (pill) body = body.replace(/(<text class="pele-frame-kind"[^>]*>[^<]*<\/text>)(\s*<rect x="[-\d.]+"( y="[-\d.]+") width="[\d.]+"( height="[\d.]+" rx="3"[^>]*)\/>)?(\s*<text class="pele-frame-label"[^>]*?) x="[-\d.]+"([^>]*?) text-anchor="middle"([^>]*)>([^<]*)</, (t, kind, chip, cy, crest, head, rest, after, label) => {
      const x = +(+pill[1] + +pill[2] + gap).toFixed(2);
      const newChip = chip ? `<rect x="${x}"${cy} width="${chipW(label)}"${crest}/>` : '';
      return `${kind}${newChip}${head} x="${chip ? x + 4 : x}"${rest} text-anchor="start" data-frame-title="1"${after}>${label}<`;
    });
    // Else labels sit on a chip at a divider: start them inside the frame, on a chip widened for Kalam.
    if (!Number.isNaN(frameX)) body = body.replace(/<rect x="[-\d.]+" y="([-\d.]+)" width="[\d.]+" height="([\d.]+)" rx="3"([^>]*)\/>(\s*<text class="pele-frame-label"(?![^>]*data-frame-title)[^>]*?) x="[-\d.]+"([^>]*?) text-anchor="middle"([^>]*)>([^<]*)</g, (t, y, h, rrest, head, rest, after, label) => {
      const x = frameX + gap;
      return `<rect x="${x}" y="${y}" width="${chipW(label)}" height="${h}" rx="3"${rrest}/>${head} x="${x + 4}"${rest} text-anchor="start"${after}>${label}<`;
    });
    return open + body + close;
  });
}

// Pele centres a sequence frame's tag (par, loop, alt) for its own font; in Kalam the text sits
// low. Grow the pill by `grow` (downward, since it shares the frame's top edge) so the text keeps
// 4px from the frame outline, and centre the text on it with a central baseline, which holds for any font.
export function centreTags(svg, grow = 5) {
  return svg.replace(/(<rect x="[-\d.]+" y="([-\d.]+)" width="[\d.]+") height="([\d.]+)"([^>]*\/>\s*<text class="pele-frame-kind"[^>]*?) y="[-\d.]+"/g,
    (_, head, y, h, rest) => `${head} height="${+h + grow}"${rest} y="${+(+y + (+h + grow) / 2).toFixed(2)}" dominant-baseline="central"`);
}

// On a line with a bend, Pele can put the label right where the bend ends (ER fan-outs
// do this in every direction). Move such a label to the middle of the line's longest
// straight stretch, keeping `gap` from the bend and `end` clear of the end markers.
// When that stretch is shorter than the label (the S-curves Pele draws for a pair of
// opposite transitions), put the label beside it on the outside of the bulge instead: left or
// right of a vertical stretch, above or below a horizontal one. Widths are measured for Kalam.
// Labels on fully straight lines are left alone.
export function labelsOffBends(svg, { gap = 6, end = 20, beside = 8, kalamSize = 17, kalamCharW = 0.48 } = {}) {
  const runs = {};
  for (const m of svg.matchAll(/<g class="pele-edge[^"]*" data-id="([^"]+)">\s*<path d="([^"]+)"/g)) {
    if (!/C/.test(m[2])) continue;
    // Straight stretches: runs of M/L vertices along one axis; a C command ends a run.
    const found = [];
    let run = [];
    const close = () => { if (run.length > 1) found.push(run); run = []; };
    for (const seg of m[2].match(/[MLC][^MLC]*/g)) {
      const pts = [...seg.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((p) => [+p[1], +p[2]]);
      if (seg[0] === 'C') { close(); run = [pts.at(-1)]; } else run.push(...pts);
    }
    close();
    const start = found[0]?.[0] ?? m[2].match(/M(-?[\d.]+),(-?[\d.]+)/).slice(1).map(Number);
    // Usable span of each stretch: trimmed by `gap` at a bend and by `end` at a path end (markers).
    let best = null;
    found.forEach((pts, i) => {
      const [p, q] = [pts[0], pts.at(-1)];
      const vertical = p[0] === q[0];
      if (!vertical && p[1] !== q[1]) return;
      const axis = vertical ? 1 : 0;
      const [pTrim, qTrim] = [i === 0 && m[2].startsWith(`M${p[0]},${p[1]}`) ? end : gap, i === found.length - 1 && m[2].endsWith(`${q[0]},${q[1]}`) ? end : gap];
      const [lo, hi] = p[axis] <= q[axis] ? [p[axis] + pTrim, q[axis] - qTrim] : [q[axis] + qTrim, p[axis] - pTrim];
      const raw = Math.abs(q[axis] - p[axis]);
      if (!best || hi - lo > best.hi - best.lo) best = { at: p, vertical, lo, hi, raw, mid: (p[axis] + q[axis]) / 2 };
    });
    if (best) runs[m[1]] = { ...best, start };
  }
  // Pele sizes label chips for Arial; outside labels render in Kalam, which is wider.
  const kalamW = {};
  for (const m of svg.matchAll(/<g class="pele-edge-label" data-id="([^"]+)">[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>/g))
    kalamW[m[1]] = Math.max(...m[2].split(/<\/tspan>/).map((t) => t.replace(/<[^>]+>/g, '').length)) * kalamSize * kalamCharW + 8;
  const moved = [];
  const out = svg.replace(/(<g class="pele-edge-label" data-id="([^"]+)">\s*)<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)>(\s*<text) x="([-\d.]+)" y="([-\d.]+)"/g,
    (all, head, id, x, y, w, h, rest, text, tx, ty) => {
      const r = runs[id];
      if (!r) return all;
      const size = r.vertical ? +h : Math.max(+w, kalamW[id] ?? 0), c = (r.lo + r.hi) / 2;
      const [cx, cy] = [+x + +w / 2, +y + +h / 2];
      let dx, dy;
      if (r.hi - r.lo >= size) [dx, dy] = r.vertical ? [r.at[0] - cx, c - cy] : [c - cx, r.at[1] - cy];
      // Pele sizes the straight middle of a horizontal S-curve to its label: centre it there.
      else if (!r.vertical && r.raw >= size) [dx, dy] = r.vertical ? [r.at[0] - cx, r.mid - cy] : [r.mid - cx, r.at[1] - cy];
      // Too short: beside a vertical stretch on its bulge side, above a horizontal one.
      else if (r.vertical) { const side = r.at[0] < r.start[0] ? -1 : 1; [dx, dy] = [r.at[0] + side * (beside + +w / 2) - cx, c - cy]; }
      else { const side = r.at[1] < r.start[1] ? -1 : 1; [dx, dy] = [r.mid - cx, r.at[1] + side * (beside + +h / 2) - cy]; }
      const f = (v) => +v.toFixed(2);
      moved.push([+x + dx - gap, +y + dy - gap, +w + 2 * gap, +h + 2 * gap]);
      return `${head}<rect x="${f(+x + dx)}" y="${f(+y + dy)}" width="${w}" height="${h}"${rest}>${text} x="${f(+tx + dx)}" y="${f(+ty + dy)}"`;
    });
  // A label moved beside its line can land outside the drawing.
  return fitViewBox(out, moved);
}

// Kalam's 5 reads as an S, so a code like 5xx in a handwritten label reads "Sxx". Mark text holding
// such a code (class pele-literal) so the stylesheet sets it in the UI sans.
export function literalCodes(svg) {
  return svg.replace(/<text((?: [\w:-]+="[^"]*")*)>([^<]*\b\dxx\b[^<]*)<\/text>/gi, (all, attrs, text) =>
    /class="/.test(attrs) ? `<text${attrs.replace(/class="([^"]*)"/, 'class="$1 pele-literal"')}>${text}</text>` : `<text class="pele-literal"${attrs}>${text}</text>`);
}

// Chart bars carry no ids; number them bar-1, bar-2, … in data order so emphasis can target one by
// data-id, and their value labels value-1, value-2, … to match.
export function barIds(svg) {
  svg = svg.replace(/(<g class="pele-data-labels"[^>]*>)([\s\S]*?)(<\/g>)/g, (_, open, body, close) => {
    let n = 0;
    return open + body.replace(/<text /g, () => `<text data-id="value-${++n}" `) + close;
  });
  return svg.replace(/(<g class="pele-series pele-bars"[^>]*>)([\s\S]*?)(<\/g>)/g, (_, open, body, close) => {
    let n = 0;
    return open + body.replace(/<rect /g, () => `<rect data-id="bar-${++n}" `) + close;
  });
}

// The box of an element (a node, group, edge or chart bar, by data-id) in the diagram's own
// coordinates, the ones addNotes takes: { x, y, w, h, cx, cy }. Place notes from it so they follow the layout.
export function locate(svg, id) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\// Handwritten notes: short Kalam text');
  const node = svg.match(new RegExp(`<g class="pele-node[^"]*" data-id="${esc}"[^>]*transform="translate\\(([-\\d.]+),([-\\d.]+)\\)"[^>]*>\\s*<rect(?: x="([-\\d.]+)")?(?: y="([-\\d.]+)")? width="([\\d.]+)" height="([\\d.]+)"`));
  const rect = svg.match(new RegExp(`<g class="pele-(?:node|cluster)[^"]*" data-id="${esc}">\\s*<rect x="([-\\d.]+)" y="([-\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"`));
  const path = svg.match(new RegExp(`<g class="pele-edge[^"]*" data-id="${esc}">\\s*<path d="([^"]+)"`));
  const bare = svg.match(new RegExp(`<rect data-id="${esc}" x="([-\\d.]+)" y="([-\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"`));
  let x, y, w, h;
  if (bare) [x, y, w, h] = bare.slice(1).map(Number);
  else if (node) { const [tx, ty, rx = 0, ry = 0, rw, rh] = node.slice(1).map((v) => (v === undefined ? undefined : +v)); [x, y, w, h] = [tx + (rx ?? 0), ty + (ry ?? 0), rw, rh]; }
  else if (rect) [x, y, w, h] = rect.slice(1).map(Number);
  else if (path) {
    const pts = [...path[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    [x, y, w, h] = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  } else return null;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

// Handwritten notes: short Kalam text that explains or adds to a diagram, with an optional leader line
// or bracket. Call after fixDiagram. Each note is { x, y, text, anchor = 'start', emphasis = false, path }
// in the diagram's own coordinates (the ones its elements use); y is the first line's baseline, '\n'
// breaks lines, and path is an SVG path d for the leader or bracket. The drawing grows to fit.
export function addNotes(svg, notes, { fontSize = 17, charW = 0.46, lineHeight = 20 } = {}) {
  if (!notes.length) return svg;
  const [tx, ty] = svg.match(/<g transform="translate\(([-\d.]+),([-\d.]+)\)">/)?.slice(1) ?? [0, 0];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const boxes = [];
  const body = notes.map(({ x, y, text, anchor = 'start', emphasis = false, path }) => {
    const lines = text.split('\n');
    const w = Math.max(...lines.map((l) => l.length)) * fontSize * charW;
    boxes.push([anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2, y - fontSize, w, lines.length * lineHeight + 4]);
    const cls = `pele-annotation${emphasis ? ' pele-annotation-emphasis' : ''}`;
    const line = path ? `<path class="pele-annotation-line${emphasis ? ' pele-annotation-emphasis-line' : ''}" d="${path}" fill="none"/>` : '';
    return `${line}<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" stroke="none">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${esc(l)}</tspan>`).join('')}</text>`;
  }).join('');
  const at = svg.lastIndexOf('</svg>');
  return fitViewBox(svg.slice(0, at) + `<g class="pele-annotations" transform="translate(${tx},${ty})">${body}</g>` + svg.slice(at), boxes, 4);
}

// A node whose label has an explicit <br/> in the Mermaid source has a title and a subtitle; a
// name Pele wraps to fit looks the same in the SVG (two tspans) but is one name. Mark the nodes
// with a subtitle (class pele-subtitled) from the source, so only they get subtitle styling.
export function markSubtitles(svg, source = '') {
  const ids = new Set([...source.matchAll(/([A-Za-z_][\w-]*)\s*(?:\(\[|\[\[|\[\(|\{\{|\[|\(|\{)\s*"?[^"\]\n]*?<br\s*\/?>/g)].map((m) => m[1]));
  if (!ids.size) return svg;
  return svg.replace(/<g class="(pele-node[^"]*)" data-id="([^"]+)"/g, (all, cls, id) => (ids.has(id) ? `<g class="${cls} pele-subtitled" data-id="${id}"` : all));
}

export const fixAll = async (svg, source = '') => loopRoom(invertKnockouts(await swapIcons(barIds(literalCodes(clusterLabelsClear(selfMessageLabels(labelsOffBends(frameLabels(centreTags(padFrames(markSubtitles(svg, source))))))))))));
