// Inline at the end of the page. File pills and "Full file" links open a file's code in a dialog,
// with the lines they refer to highlighted and scrolled into view.
//
// Markup it reads (the build writes it; without JavaScript every link still works as an anchor):
//   <a href="#ROW" data-file="ROW" data-lines="27,29,33-34">…</a>   a pill or link; data-lines optional
//   <details id="ROW" data-repo="owner/name or name" data-path="full/path" style="--hue: …">
//     … <figure class="code">…</figure>                               the row's code: an excerpt or a diff
//     <template class="whole"><figure class="code">…</figure></template>   modified files: the whole file
//   </details>
// An excerpt's figure holds .code-body with a .gutter of line numbers (one per line) beside the code;
// a diff's figure holds a Pierre <diffs-container>. Lines are new-file line numbers.
//
// A modified file gets Changes and Whole file tabs; the viewer opens on Changes unless a highlighted
// line isn't in the diff. The diff is borrowed from its row (a declarative shadow root can't be cloned)
// and returned on close. Style it with the .viewer rules in references/html-presentation.md.
(() => {
  if (!('HTMLDialogElement' in window)) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'viewer';
  dlg.setAttribute('aria-labelledby', 'viewer-title');
  dlg.innerHTML = '<header class="vh"><span class="vdot"></span><div class="vt"><span class="vrepo"></span><span id="viewer-title" class="vpath"></span></div>' +
    '<span class="vlines"></span><div class="vtabs" role="tablist"><button type="button" role="tab" data-tab="diff">Changes</button><button type="button" role="tab" data-tab="whole">Whole file</button></div>' +
    '<form method="dialog"><button class="vclose" aria-label="Close"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg></button></form></header><div class="vb"></div>';
  document.body.append(dlg);
  const body = dlg.querySelector('.vb'), tabs = dlg.querySelector('.vtabs');
  let row = null, lines = [], borrowed = null, cleanup = [];

  // "27,29,33-34" → [27, 29, 33, 34]
  const parse = (s) => (s || '').split(',').filter(Boolean).flatMap((p) => {
    const [a, b = a] = p.split('-').map(Number);

    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  });

  const giveBack = () => {
    cleanup.forEach((f) => f());
    cleanup = [];

    if (borrowed) {
      borrowed.mark.replaceWith(borrowed.node);
      borrowed = null;
    }

    body.replaceChildren();
  };

  // A diff: style the shadow root's rows and number cells. Returns the first highlighted row.
  const markDiff = (fig) => {
    const root = fig.querySelector('diffs-container')?.shadowRoot;

    if (!root || !lines.length) return null;
    const rows = lines.map((n) => `[data-line="${n}"]:not([data-line-type="change-deletion"])`);
    const nums = lines.map((n) => `[data-column-number="${n}"]:not([data-line-type="change-deletion"])`);
    const style = document.createElement('style');
    style.textContent = `${rows.join(',')} { background: color-mix(in srgb, #ff79c6 18%, transparent) !important; }
      ${nums.join(',')} { background: color-mix(in srgb, #ff79c6 26%, transparent) !important; box-shadow: inset 3px 0 #ff79c6; color: #f8f8f2 !important; }`;
    root.append(style);
    cleanup.push(() => style.remove());

    return root.querySelector(rows.join(','));
  };

  // An excerpt: a band behind each highlighted line, placed from the gutter's line height.
  // The gutter's padding is outside its lines, so it's left out of the height and added to the offset.
  const markExcerpt = (fig) => {
    const cb = fig.querySelector('.code-body'), gutter = fig.querySelector('.gutter');

    if (!cb || !gutter || !lines.length) return null;
    const nums = gutter.textContent.trim().split('\n').map(Number);
    const style = getComputedStyle(gutter);
    const padTop = parseFloat(style.paddingTop);
    const lh = (gutter.clientHeight - padTop - parseFloat(style.paddingBottom)) / nums.length;
    let first = null;

    for (const n of lines) {
      const i = nums.indexOf(n);

      if (i < 0) continue;
      const band = document.createElement('div');
      band.className = 'vband';
      band.style.top = `${gutter.offsetTop + padTop + i * lh}px`;
      band.style.height = `${lh}px`;
      cb.append(band);
      cleanup.push(() => band.remove());
      first ??= band;
    }

    return first;
  };

  const ownCode = () => row.querySelector('figure.code');

  const inDiff = (fig) => {
    const root = fig.querySelector('diffs-container')?.shadowRoot;

    return !!root && lines.every((n) => root.querySelector(`[data-line="${n}"]`));
  };

  const show = (tab) => {
    giveBack();
    const whole = row.querySelector('template.whole');
    let fig;

    if (tab === 'whole' && whole) {
      fig = whole.content.firstElementChild.cloneNode(true);
      body.append(fig);
    } else {
      fig = ownCode();
      const mark = document.createComment('viewer');
      fig.replaceWith(mark);
      borrowed = { node: fig, mark };
      body.append(fig);
    }

    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const first = fig.querySelector('diffs-container') ? markDiff(fig) : markExcerpt(fig);
    body.scrollTop = 0;

    if (first) requestAnimationFrame(() => first.scrollIntoView({ block: 'center' }));
  };

  const open = (id, spec) => {
    row = document.getElementById(id);

    if (!row || !ownCode()) return false;
    lines = parse(spec);
    dlg.style.setProperty('--hue', row.style.getPropertyValue('--hue'));
    dlg.querySelector('.vrepo').textContent = row.dataset.repo || '';
    dlg.querySelector('.vpath').textContent = row.dataset.path || '';
    dlg.querySelector('.vlines').textContent = lines.length ? `Highlighting ${spec.split(',').map((p) => p.replace('-', '–')).join(', ')}` : '';
    const hasWhole = !!row.querySelector('template.whole');
    tabs.hidden = !hasWhole;
    dlg.showModal();
    show(hasWhole && lines.length && !inDiff(ownCode()) ? 'whole' : 'diff');

    return true;
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-file]');

    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;

    if (open(a.dataset.file, a.dataset.lines)) e.preventDefault();
  });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');

    if (b) show(b.dataset.tab);
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  // The close event arrives a task later; if another file has opened since, leave it alone.
  dlg.addEventListener('close', () => {
    if (!dlg.open) giveBack();
  });
})();
