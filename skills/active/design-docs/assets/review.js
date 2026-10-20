// Review copy: shows a design's draft changes on the doc. Each changed passage gets a flag that opens the current and
// changed text side by side; the top bar lists every change and switches the whole doc between current and changed.
// Only `doc.mjs review` adds this script, and only to the local review copy.
(() => {
  const data = document.getElementById("review-changes");

  if (data === null) return;

  const changes = JSON.parse(data.textContent);
  const byId = new Map(changes.map((change) => [change.id, change]));
  const originals = [];
  let showing = "current";

  const make = (tag, className, content) => {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (content !== undefined) node.textContent = content;

    return node;
  };

  const esc = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const norm = (text) => text.replace(/\s+/g, " ").trim();

  // Compare text without bracketed references, which the doc may have moved into markers.
  const key = (text) =>
    norm(text.replace(/\((?:\s*[EQDRP]\d+\s*[,;]?)+\)/g, " "))
      .split(" ")
      .slice(0, 12)
      .join(" ");

  const words = (text) => norm(text).split(" ").filter(Boolean).length;

  // Word diff by longest common subsequence.
  const diff = (before, after) => {
    const a = norm(before).split(" ");
    const b = norm(after).split(" ");
    const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));

    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }

    const steps = [];
    let i = 0;
    let j = 0;

    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        steps.push(["=", a[i]]);
        i += 1;
        j += 1;
      } else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) {
        steps.push(["+", b[j]]);
        j += 1;
      } else {
        steps.push(["-", a[i]]);
        i += 1;
      }
    }

    const side = (keep) => {
      const runs = [];

      for (const [op, word] of steps) {
        if (!keep.includes(op)) continue;

        const last = runs.at(-1);

        if (last !== undefined && last.op === op) last.words.push(word);
        else runs.push({ op, words: [word] });
      }

      return runs
        .map(({ op, words: run }) => {
          const text = esc(run.join(" "));

          if (op === "=") return text;

          const tag = op === "-" ? "del" : "ins";

          return `<${tag} class="rv">${text}</${tag}>`;
        })
        .join(" ");
    };

    return { before: side(["=", "-"]), after: side(["=", "+"]) };
  };

  const changedHtml = (change) =>
    change.proposedParts === null
      ? esc(change.proposed)
      : `<dl class="rv-parts">${change.proposedParts.map(([label, text]) => `${label ? `<dt>${esc(label)}</dt>` : ""}<dd>${esc(text)}</dd>`).join("")}</dl>`;

  // Find each change's passage: the outermost element whose text is the passage.
  const decorate = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement;

      if (parent === null || parent.closest(".rv-target, .rv-ui, script, style") !== null) continue;

      const text = key(node.textContent);

      if (text === "") continue;

      for (const change of changes) {
        const want = key(change.was);

        if (!want.startsWith(text) && !text.startsWith(want)) continue;

        let element = parent;

        while (element.parentElement !== null && !element.matches("p, li, td, dd, dt, small, .t") && key(element.parentElement.textContent).startsWith(want)) element = element.parentElement;

        if (key(element.textContent).startsWith(want)) found.push([element, change]);
      }
    }

    for (const [element, change] of found) {
      if (element.classList.contains("rv-target")) continue;

      element.classList.add("rv-target");
      element.dataset.change = change.id;
      element.dataset.original = String(originals.push(element.innerHTML) - 1);
      render(element);
    }
  };

  const render = (element) => {
    const change = byId.get(element.dataset.change);
    const inline = element.matches("span, small, a, b, .t");
    const body = showing === "changed" ? (inline ? `<span class="rv-changed">${esc(change.proposed)}</span>` : `<div class="rv-changed">${changedHtml(change)}</div>`) : originals[Number(element.dataset.original)];
    const flag = `<button type="button" class="rv-flag rv-ui" data-rv-open="${change.id}" title="Compare">${change.id}</button>`;

    element.classList.toggle("rv-inline", inline);
    element.innerHTML = body + flag;
  };

  const renderAll = () => {
    for (const element of document.querySelectorAll(".rv-target")) render(element);

    updateBar();
  };

  // Top bar: the list of changes, and the whole doc current or changed.
  const bar = make("div", "rv-bar rv-ui");

  const updateBar = () => {
    bar.innerHTML =
      `<button type="button" class="rv-count" data-rv-list>${changes.length} change${changes.length === 1 ? "" : "s"}</button>` +
      [
        ["current", "Current"],
        ["changed", "Changed"],
      ]
        .map(([value, label]) => `<button type="button" data-rv-show="${value}" aria-pressed="${showing === value}">${label}</button>`)
        .join("");
  };

  updateBar();
  document.querySelector(".topbar [data-view-all]")?.before(bar);

  const dialog = make("dialog", "rv-dialog rv-ui");
  const list = make("dialog", "rv-dialog rv-list rv-ui");

  document.body.append(dialog, list);

  const notes = (change) =>
    [change.state === "stale" ? "The text it rewrites has changed since it was drafted." : "", change.added.length > 0 ? `Cites ${change.added.join(", ")}, which the current text doesn't.` : ""]
      .flatMap((note) => (note === "" ? [] : [`<p class="rv-note">${esc(note)}</p>`]))
      .join("");

  const openCompare = (id) => {
    const change = byId.get(id);
    const sides = diff(change.was, change.proposed);

    dialog.innerHTML = `
      <header><span class="rv-id">${change.id}</span><h3>${esc(change.where)}</h3><button type="button" class="rv-close" data-rv-close>×</button></header>
      ${change.why ? `<p class="rv-why">${esc(change.why)}</p>` : ""}${notes(change)}
      <div class="rv-cols">
        <div class="rv-col rv-current"><h4>Current <span>${words(change.was)} words</span></h4><div>${sides.before}</div></div>
        <div class="rv-col rv-changed-col"><h4>Changed <span>${words(change.proposed)} words</span></h4><div>${change.proposedParts === null ? sides.after : changedHtml(change)}</div></div>
      </div>`;

    if (!dialog.open) dialog.showModal();

    document.activeElement?.blur();
  };

  const pageOf = (element) => element.closest("article.page");

  const goTo = (id) => {
    for (const open of document.querySelectorAll("dialog[open]")) open.close();

    const targets = [...document.querySelectorAll(`.rv-target[data-change="${id}"]`)];
    const visible = targets.find((element) => element.getClientRects().length > 0);
    // Detail the doc copies into its modal sits hidden on the page; it isn't somewhere to scroll to.
    const target = visible ?? targets.find((element) => pageOf(element) !== null && element.closest("[id$='-detail']") === null) ?? null;
    const change = byId.get(id);

    if (target === null) {
      // A record's own field shows in its modal: open the record, then find the passage there.
      const row = change.recordId === null ? null : document.querySelector(`[data-detail="${change.recordId}-detail"]`);

      if (row !== null) {
        document.querySelector(`a[href="#${pageOf(row)?.id}"]`)?.click();
        setTimeout(() => {
          row.click();
          setTimeout(() => flash(document.querySelector(`dialog[open] .rv-target[data-change="${id}"]`)), 150);
        }, 80);
      }

      return;
    }

    if (visible === undefined) document.querySelector(`a[href="#${pageOf(target)?.id}"]`)?.click();

    setTimeout(() => flash([...document.querySelectorAll(`.rv-target[data-change="${id}"]`)].find((element) => element.getClientRects().length > 0) ?? null), 80);
  };

  const flash = (element) => {
    if (element === null) return;

    element.scrollIntoView({ block: "center", behavior: "instant" });
    element.classList.remove("rv-flash");
    void element.offsetWidth;
    element.classList.add("rv-flash");
  };

  const openList = () => {
    const order = [...document.querySelectorAll("article.page")].map((page) => page.id);

    const placed = changes.map((change) => {
      const element = document.querySelector(`.rv-target[data-change="${change.id}"]`);
      const page = element === null ? null : pageOf(element);

      return { change, page: page?.id ?? "", title: page?.dataset.pageTitle ?? "Not found on a page" };
    });

    placed.sort((left, right) => order.indexOf(left.page) - order.indexOf(right.page));

    let html = `<header><h3>Changes</h3><span class="rv-where">${changes.length} drafted</span><button type="button" class="rv-close" data-rv-close>×</button></header><div class="rv-list-body">`;
    let group = null;

    for (const { change, title } of placed) {
      if (title !== group) {
        html += `<div class="rv-group">${esc(title)}</div>`;
        group = title;
      }

      html += `<button type="button" class="rv-row" data-rv-go="${change.id}"><b>${change.id}</b><span class="rv-row-main"><span class="rv-row-where">${esc(change.where)}</span><span class="rv-row-why">${esc(change.why)}</span></span><span class="rv-row-meta">${words(change.was)} → ${words(change.proposed)} words${change.state === "stale" ? "<br>Stale" : ""}${change.added.length > 0 ? `<br>Adds ${esc(change.added.join(", "))}` : ""}</span><span class="rv-go" aria-hidden="true">→</span></button>`;
    }

    list.innerHTML = `${html}</div>`;

    if (!list.open) list.showModal();

    document.activeElement?.blur();
  };

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;

      if (event.target === dialog || event.target === list) {
        event.target.close();

        return;
      }

      const control = event.target.closest("[data-rv-open], [data-rv-list], [data-rv-show], [data-rv-close], [data-rv-go]");

      if (control === null) return;

      event.preventDefault();
      event.stopPropagation();

      if (control.dataset.rvOpen) openCompare(control.dataset.rvOpen);
      else if ("rvList" in control.dataset) openList();
      else if (control.dataset.rvShow) {
        showing = control.dataset.rvShow;
        renderAll();
      } else if ("rvClose" in control.dataset) control.closest("dialog")?.close();
      else if (control.dataset.rvGo) goTo(control.dataset.rvGo);
    },
    true,
  );

  // The doc adds passages as it opens records in its modal; mark them too.
  let queued = false;

  new MutationObserver(() => {
    if (queued) return;

    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      decorate();
    });
  }).observe(document.body, { childList: true, subtree: true });

  decorate();
})();
