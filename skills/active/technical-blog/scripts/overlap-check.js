// Diagram overlap check. Evaluate this file in the rendered page (for example with
// Playwright page.evaluate). It returns, for each element with class "fig", the text
// another element's line passes within 3px of (a label may sit on its own line where it
// runs straight through the label, never on a bend, curve or loop), frame labels, notes
// and handwritten notes on a sequence lifeline, text closer than 4px to the outline it sits
// inside, text crossing a group or frame outline, text over other text, text clipped at the
// edge of the drawing, and group or frame outlines that overlap each other. Lines include
// edges, dividers drawn inside groups, and lifelines; hidden lines don't count.
(() => {
  // pen.js redraws the diagrams by hand; measure the clean layout underneath, then draw again.
  const penned = window.pen?.active;
  if (penned) window.pen.undo();
  const res = {};
  for (const fig of document.querySelectorAll('.fig')) {
    const found = [];
    const texts = [...fig.querySelectorAll('svg text')].filter((t) => t.textContent.trim() && t.getBBox().width && t.getClientRects().length);
    // Lines: edges, dividers drawn inside groups (a composite state's title rule, parallel-region dividers),
    // and sequence lifelines. Hidden lines don't count.
    const visible = (sel) => [...fig.querySelectorAll(sel)].filter((p) => p.getClientRects().length);
    const lines = visible('.pele-edge path:not(.pele-marker), .pele-edges > path:not(.pele-marker), .pele-cluster > path, .pele-divider');
    // A message label crossing the lifelines it spans is normal (the line passes behind it); lifelines
    // are checked only against frame labels and notes, which shouldn't sit on one.
    const lifelines = visible('.pele-lifeline');
    const outlines = [...fig.querySelectorAll('.pele-frame > rect:first-child, .pele-cluster > rect')].map((e) => e.getBoundingClientRect());
    // Screen-space points every 2px along each line.
    const owner = (el) => el.closest("[data-id]")?.getAttribute("data-id");
    const sample = (p) => { const m = p.getScreenCTM(), n = p.getTotalLength(), out = [];
      for (let l = 0; l <= n; l += 2) out.push(new DOMPoint(p.getPointAtLength(l).x, p.getPointAtLength(l).y).matrixTransform(m)); out.id = owner(p); return out; };
    const pts = lines.map(sample), lifePts = lifelines.map(sample);
    const boxes = texts.map((t) => t.getBoundingClientRect());
    const drawing = fig.querySelector('svg').getBoundingClientRect();
    texts.forEach((t, i) => {
      const r = boxes[i], name = t.textContent.trim(), m = -3; // negative: a 3px clear zone around the text
      const own = owner(t);
      // Text cut off by the edge of the drawing (a label moved or added past the viewBox).
      if (r.left < drawing.left - 0.5 || r.right > drawing.right + 0.5 || r.top < drawing.top - 0.5 || r.bottom > drawing.bottom + 0.5) found.push(`clipped at the edge: "${name}"`);
      const near = (line) => line.filter((p) => p.x > r.left + m && p.x < r.right - m && p.y > r.top + m && p.y < r.bottom - m);
      // A label may sit on its own line where that line runs straight through it; a bend of its own line still counts.
      const straight = (ps) => ps.every((p) => Math.abs(p.x - ps[0].x) < 0.75) || ps.every((p) => Math.abs(p.y - ps[0].y) < 0.75);
      if (pts.some((line) => { const ps = near(line); return ps.length && !(line.id === own && straight(ps)); })) found.push(`line within 3px: "${name}"`);
      // Text on a background chip (an else label, a note with its backing rect) masks the lifeline behind it.
      const chip = t.previousElementSibling?.tagName === 'rect' && getComputedStyle(t.previousElementSibling).fill !== 'none';
      if (t.matches('.pele-frame-label, .pele-note text, .pele-annotation') && !chip && lifePts.some((line) => near(line).length)) found.push(`lifeline within 3px: "${name}"`);
      // Text straddling an outline: neither inside nor clear of it. Kalam's line box is taller than its ink, so the
      // vertical extent is trimmed as in the text-over-text test.
      const [it, ib] = [r.top + r.height * 0.2, r.bottom - r.height * 0.2];
      for (const o of outlines) {
        const overlaps = r.right > o.left + 1 && r.left < o.right - 1 && ib > o.top + 1 && it < o.bottom - 1;
        const inside = r.left >= o.left && r.right <= o.right && it >= o.top && ib <= o.bottom;
        if (overlaps && !inside) { found.push(`crosses an outline: "${name}"`); break; }
      }
      for (const o of outlines) if (r.left >= o.left && r.right <= o.right && r.top >= o.top && r.bottom <= o.bottom) {
        const d = Math.min(r.left - o.left, o.right - r.right, r.top - o.top, o.bottom - r.bottom);
        if (d < 4) found.push(`${d.toFixed(1)}px from its outline: "${name}"`);
      }
      // Text over text. Line boxes are taller than the ink (Kalam's especially), so compare the middle 60%
      // of each box's height; a halo copy of the same text in the same group doesn't count.
      for (let j = i + 1; j < texts.length; j++) {
        const q = boxes[j], other = texts[j].textContent.trim();
        if (other === name && texts[j].parentNode === t.parentNode) continue;
        const [a0, a1] = [r.top + r.height * 0.2, r.bottom - r.height * 0.2], [b0, b1] = [q.top + q.height * 0.2, q.bottom - q.height * 0.2];
        if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(a1, b1) - Math.max(a0, b0) > 1) found.push(`text over text: "${name}" / "${other}"`);
      }
    });
    // Outlines that cross each other: two groups or frames that overlap without one containing the other.
    const rects = [...fig.querySelectorAll('.pele-frame > rect:first-child, .pele-cluster > rect')].filter((e) => e.getClientRects().length).map((e) => [e, e.getBoundingClientRect()]);
    const contains = (a, b) => b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [ea, a] = rects[i], [eb, b] = rects[j];
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      if (overlap && !contains(a, b) && !contains(b, a)) found.push(`outlines overlap: ${ea.parentNode.getAttribute('data-id') ?? ea.parentNode.getAttribute('class')} / ${eb.parentNode.getAttribute('data-id') ?? eb.parentNode.getAttribute('class')}`);
    }
    res[fig.id] = found;
  }
  if (penned) window.pen.draw();
  return res;
})()
