// Design doc behaviour: pages, reference cards, rail section tracking, views, and the theme toggle.
// The page stays usable without this script: pages follow one another and references are plain in-page links.
(() => {
  const KIND_LABELS = {
    evidence: "Evidence",
    question: "Question",
    decision: "Decision",
    requirement: "Requirement",
    deliverable: "Deliverable",
    flow: "Data flow",
  };

  const THEME_KEY = "design-docs-theme";
  const supportsPopover = "showPopover" in HTMLElement.prototype;
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);

  const make = (tag, className, content) => {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (content !== undefined) node.textContent = content;

    return node;
  };

  const flatText = (node) => node.textContent.replace(/\s+/g, " ").trim();

  const definitionFor = (id) => {
    const node = document.getElementById(id);

    return node !== null && node.hasAttribute("data-ref") ? node : null;
  };

  const refIdOf = (link) => {
    const href = link.getAttribute("href") ?? "";
    const id = href.startsWith("#") ? href.slice(1) : "";

    return definitionFor(id) === null ? null : id;
  };

  // Pages. A doc with several pages shows one at a time; ?page=<id> picks it.

  const docRoot = document.querySelector(".doc");
  const pages = [...document.querySelectorAll("article.page")];
  const multiPage = docRoot !== null && docRoot.classList.contains("multi") && pages.length > 1;
  const baseTitle = document.title;
  let currentPage = null;

  const pageOf = (node) => node.closest("article.page");

  const pageTitle = (page) => page.dataset.pageTitle ?? page.id;

  const urlFor = (page, hash) => {
    const next = new URLSearchParams(location.search);

    next.set("page", page.id);
    next.delete("card");

    return `?${next}${hash ? `#${hash}` : ""}`;
  };

  // Rail: highlight the section that takes up the most of the screen.
  // Each nav target owns the page from its top to the next target's top.

  let navLinks = [];
  let navTargets = [];
  let frameRequested = false;

  const collectNav = () => {
    const scope = multiPage ? document.querySelector(".page-rail.current") : document;

    navLinks = [];
    navTargets = [];

    if (scope === null) return;

    for (const link of scope.querySelectorAll(".rail-nav a[href^='#']")) {
      const target = document.getElementById(link.getAttribute("href").slice(1));

      if (target === null) continue;
      navLinks.push(link);
      navTargets.push(target);
    }
  };

  const markCurrent = () => {
    frameRequested = false;

    if (navTargets.length === 0) return;

    const tops = [];

    for (const target of navTargets) tops.push(target.getBoundingClientRect().top);
    tops.push(document.documentElement.getBoundingClientRect().bottom);

    let current = 0;
    let bestVisible = -1;

    for (const index of navTargets.keys()) {
      const visible = Math.min(tops[index + 1], window.innerHeight) - Math.max(tops[index], 0);

      if (visible > bestVisible) {
        bestVisible = visible;
        current = index;
      }
    }

    for (const [index, link] of navLinks.entries()) link.setAttribute("aria-current", String(index === current));
  };

  window.addEventListener(
    "scroll",
    () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(markCurrent);
    },
    { passive: true },
  );
  window.addEventListener("resize", markCurrent);

  // The top bar names the page being read, with its icon from the page switcher.
  const showCurrentPage = (page) => {
    const name = document.querySelector("[data-current-page]");
    const icon = document.querySelector("[data-current-icon] use");
    const switcherIcon = document.querySelector(`.rail-page[href="#${page.id}"] use`);

    if (name !== null) name.textContent = pageTitle(page);

    if (icon !== null && switcherIcon !== null) icon.setAttribute("href", switcherIcon.getAttribute("href") ?? "");
  };

  const showPage = (page) => {
    if (!multiPage || page === null || page === currentPage) return;

    currentPage = page;

    for (const each of pages) each.classList.toggle("current", each === page);

    for (const rail of document.querySelectorAll(".page-rail")) rail.classList.toggle("current", rail.dataset.page === page.id);

    for (const link of document.querySelectorAll(".rail-page")) {
      if (link.getAttribute("href") === `#${page.id}`) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }

    document.title = `${pageTitle(page)} · ${baseTitle}`;
    showCurrentPage(page);
    collectNav();
    markCurrent();
  };

  const goToPage = (page, hash) => {
    if (page === null || page === currentPage) return;

    showPage(page);
    history.pushState(null, "", urlFor(page, hash));
  };

  // A decision or question opens in a modal: its table row, its box on a decision map, or "Open details" on its
  // card shows the detail the build wrote after the table that defines it (data-detail names it). Reference cards
  // are popovers, so they open above it, and opening another record from one replaces what the modal shows.
  const detailOf = (element) => document.getElementById(element.dataset.detail ?? "");
  const recordModal = document.createElement("dialog");

  recordModal.className = "record-modal";
  document.body.append(recordModal);

  const openDetail = (element) => {
    const detail = detailOf(element);

    if (detail === null) return;

    recordModal.replaceChildren(...[...detail.children].map((child) => child.cloneNode(true)));
    recordModal.setAttribute("aria-label", detail.getAttribute("aria-label") ?? "");

    if (!recordModal.open) recordModal.showModal();

    // Outside an open modal everything is inert, so the reference card moves in while it's open.
    recordModal.append(card);
  };

  recordModal.addEventListener("close", () => document.body.append(card));

  recordModal.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    // The backdrop is the dialog itself; a link out of the modal closes it before the page moves.
    const leaving = event.target.closest("a[href^='#']:not(.ref):not(.mention):not([data-opens])");

    if (event.target === recordModal || event.target.closest(".dm-close") !== null || leaving !== null) recordModal.close();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || event.target.closest("a, button, .ref, .mention") !== null) return;

    const opener = event.target.closest("[data-detail]");

    if (opener !== null) openDetail(opener);
  });

  document.addEventListener("keydown", (event) => {
    const opener = event.target instanceof Element && event.key === "Enter" ? event.target.closest("[data-detail]") : null;

    if (opener !== null && opener === event.target) openDetail(opener);
  });

  // Reveal a target: show its page, open any collapsed details around or inside it, scroll to it, and flash it.
  const reveal = (id) => {
    const target = document.getElementById(id);

    if (target === null) return;

    if (multiPage && target.matches("article.page")) {
      goToPage(target, "");
      window.scrollTo({ top: 0, behavior: "instant" });

      return;
    }

    if (multiPage) goToPage(pageOf(target), id);

    const inner = target.querySelector("details");
    const outer = target.closest("details");

    if (inner !== null) inner.open = true;

    if (outer !== null) outer.open = true;

    target.scrollIntoView({ block: "start" });
    target.classList.remove("flash");
    void target.offsetWidth;
    target.classList.add("flash");
  };

  // Reference cards

  const card = make("div", "ref-card");

  card.setAttribute("role", "dialog");

  if (supportsPopover) card.popover = "auto";
  document.body.append(card);

  let activeTrigger = null;
  let lastClosed = { trigger: null, at: 0 };

  // Parts marked inside a definition, excluding parts of other definitions nested within it.
  const ownParts = (definition, selector) => {
    const parts = [];

    for (const part of definition.querySelectorAll(selector)) {
      if (part.closest("[data-ref]") === definition) parts.push(part);
    }

    return parts;
  };

  const detailValue = (node) => {
    if (node.dataset.refValue !== undefined) return node.dataset.refValue;

    const items = node.querySelectorAll("li");

    if (items.length === 0) {
      // Leave out reference chips inside the cell; the card's own footer links onward.
      const copy = node.cloneNode(true);

      for (const chip of copy.querySelectorAll(".ref")) chip.remove();

      return flatText(copy);
    }

    const lines = [];

    for (const item of items) lines.push(flatText(item));

    return lines.join("\n");
  };

  const cardLink = (id, definition, kind) => {
    // A decision or question with a detail opens it, explanation first; the detail links on to its brief.
    if (detailOf(definition) !== null) return { label: "Open details", target: id, opens: true };

    // A definition can name its own onward link, such as the brief or page where a decision is worked out.
    const [ownLink] = ownParts(definition, "a[data-ref-link]");

    const href = ownLink === undefined ? "" : (ownLink.getAttribute("href") ?? "");
    const linked = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
    const linkedPage = linked === null ? null : (pageOf(linked) ?? linked);

    // Skip it when the reader is already on that page; the card then links to the item itself.
    if (linked !== null && !(multiPage && linkedPage === currentPage)) {
      return { label: ownLink.dataset.refLink || flatText(ownLink), target: linked.id };
    }

    if (kind === "decision") return { label: `Go to ${id}`, target: id };

    if (kind === "flow") return { label: "Show in the flow table", target: id };

    const home = pageOf(definition);

    if (multiPage && home !== null && home !== currentPage) return { label: `Open in ${pageTitle(home)}`, target: id };

    const sectionTitle = definition.closest(".section")?.querySelector("h2");

    return { label: sectionTitle == null ? `Go to ${id}` : `Open in ${flatText(sectionTitle)}`, target: id };
  };

  const cardContent = (id, definition) => {
    const kind = definition.dataset.ref;
    const head = make("div", "ref-card-head");
    const left = make("div", "left");

    // A definition can supply its own chip (data flows reuse their flow chip); otherwise use a reference chip.
    const [chipSource] = ownParts(definition, "[data-ref-chip]");
    const chip = chipSource === undefined ? make("span", `ref ref-${id[0].toLowerCase()}`, id) : chipSource.cloneNode(true);
    const optionMarker = kind === "flow" ? definition.closest(".option")?.querySelector(".letter, .numeral") : null;
    const kindLabel = KIND_LABELS[kind] ?? kind;

    chip.removeAttribute("data-ref-chip");
    chip.removeAttribute("id");

    if (kind === "decision") chip.dataset.state = decisionState(definition);
    left.append(chip, make("span", "kind", optionMarker == null ? kindLabel : `Flow · Option ${flatText(optionMarker)}`));
    head.append(left);

    const [status] = ownParts(definition, "[data-ref-status]");

    if (status !== undefined) {
      const isChip = status.classList.contains("status") || status.classList.contains("badge");
      const prefix = status.dataset.refStatus ?? "";
      const copy = isChip ? status.cloneNode(true) : make("span", "meta", `${prefix} ${flatText(status)}`.trim());

      copy.removeAttribute("data-ref-status");
      head.append(copy);
    }

    const body = make("div", "ref-card-body");
    const [textNode] = ownParts(definition, "[data-ref-text]");

    body.append(make("div", "text", flatText(textNode ?? definition)));

    const rows = [];

    if (kind === "decision") {
      const options = [];

      for (const option of ownParts(definition, ".option")) {
        const marker = option.querySelector(".letter, .numeral");
        const title = option.querySelector("h3");

        if (title !== null) options.push(`${marker === null ? "" : `${flatText(marker)} · `}${flatText(title)}`);
      }

      if (options.length > 0) rows.push(["Options", options.join("\n")]);
    }

    const details = [];

    for (const detail of ownParts(definition, "[data-ref-detail]")) details.push([detail.dataset.refDetail, detailValue(detail)]);

    // A decision's short Why lives in its detail; it follows the answer.
    const more = kind === "decision" ? detailOf(definition) : null;

    if (more !== null) {
      const reasons = [];

      for (const detail of more.querySelectorAll("[data-ref-detail]")) reasons.push([detail.dataset.refDetail, detailValue(detail)]);
      details.splice(Math.min(1, details.length), 0, ...reasons);
    }

    rows.push(...details);

    if (rows.length > 0) {
      const list = make("dl");

      for (const [label, value] of rows) list.append(make("dt", "", label), make("dd", "", value));
      body.append(list);
    }

    const foot = make("div", "ref-card-foot");
    const tags = make("div", "tags");

    for (const tagGroup of ownParts(definition, "[data-ref-tags]")) {
      for (const tag of tagGroup.querySelectorAll(".tag, .badge")) tags.append(tag.cloneNode(true));
    }

    const onward = cardLink(id, definition, kind);
    const link = make("a", "", `${onward.label} →`);

    link.href = `#${onward.target}`;
    link.dataset.reveal = onward.target;

    if (onward.opens) link.dataset.opens = "";
    foot.append(tags, link);

    return [head, body, foot];
  };

  const place = () => {
    if (activeTrigger === null) return;

    const margin = 12;
    const anchor = activeTrigger.getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const left = Math.min(Math.max(margin, anchor.left - 12), window.innerWidth - width - margin);
    const below = anchor.bottom + 8;
    const above = anchor.top - height - 8;
    const top = below + height > window.innerHeight - margin && above > margin ? above : below;

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  };

  const release = () => {
    if (activeTrigger !== null) activeTrigger.setAttribute("aria-expanded", "false");
    lastClosed = { trigger: activeTrigger, at: performance.now() };
    activeTrigger = null;
  };

  const closeCard = () => {
    if (supportsPopover) {
      if (card.matches(":popover-open")) card.hidePopover();

      return;
    }

    card.classList.remove("is-open");
    release();
  };

  const openCard = (trigger, id) => {
    const definition = definitionFor(id);

    if (definition === null) return;

    if (activeTrigger !== null) activeTrigger.setAttribute("aria-expanded", "false");

    card.replaceChildren(...cardContent(id, definition));
    activeTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");

    if (supportsPopover) {
      if (!card.matches(":popover-open")) card.showPopover();
    } else {
      card.classList.add("is-open");
    }

    place();
  };

  card.addEventListener("toggle", (event) => {
    if (event.newState === "closed") release();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const revealLink = event.target.closest("[data-reveal]");

    if (revealLink !== null) {
      event.preventDefault();
      closeCard();

      const opens = revealLink.dataset.opens === undefined ? null : document.getElementById(revealLink.dataset.reveal);

      if (opens !== null) {
        openDetail(opens);

        return;
      }

      if (!multiPage) history.replaceState(null, "", `#${revealLink.dataset.reveal}`);
      reveal(revealLink.dataset.reveal);

      return;
    }

    const trigger = event.target.closest("a.ref, a.mention, a.flow");
    const id = trigger === null ? null : refIdOf(trigger);

    if (trigger === null || id === null) {
      if (!supportsPopover && !card.contains(event.target)) closeCard();

      // In a doc with pages, an in-page link to something on another page switches to that page first.
      const link = event.target.closest("a[href^='#']");
      const targetId = link === null ? "" : link.getAttribute("href").slice(1);
      const target = targetId === "" ? null : document.getElementById(targetId);

      if (multiPage && target !== null && (target.matches("article.page") || pageOf(target) !== currentPage)) {
        event.preventDefault();
        reveal(targetId);
      }

      return;
    }

    event.preventDefault();

    const justClosedHere = lastClosed.trigger === trigger && performance.now() - lastClosed.at < 300;

    if (trigger === activeTrigger || justClosedHere) {
      closeCard();

      return;
    }

    openCard(trigger, id);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !supportsPopover) closeCard();
  });

  window.addEventListener("scroll", place, { passive: true });
  window.addEventListener("resize", place);

  // Decision markers take their colour from the decision's own status, so it's written in one place.

  function decisionState(definition) {
    const [status] = ownParts(definition, "[data-ref-status]");

    if (status === undefined) return "later";

    for (const state of ["decided", "leaning", "open"]) {
      if (status.classList.contains(state)) return state;
    }

    return "later";
  }

  for (const marker of document.querySelectorAll("a.ref-d")) {
    const id = refIdOf(marker);

    if (id !== null) marker.dataset.state = decisionState(definitionFor(id));
  }

  // "Cited on": for items on shared pages, list the other pages that refer to them.

  const citedOn = new Map();

  for (const trigger of document.querySelectorAll("a.ref, a.mention, a.flow")) {
    const id = refIdOf(trigger);
    const from = pageOf(trigger);
    const definition = id === null ? null : definitionFor(id);

    if (definition === null || from === null || from === pageOf(definition)) continue;

    const pagesCiting = citedOn.get(id) ?? new Set();

    pagesCiting.add(from);
    citedOn.set(id, pagesCiting);
  }

  for (const cell of document.querySelectorAll("[data-cited-on]")) {
    const definition = cell.closest("[data-ref]");

    if (definition === null) continue;

    const citing = citedOn.get(definition.id) ?? new Set();
    const ordered = pages.filter((page) => citing.has(page));
    const tags = make("div", "tags stack");

    for (const page of ordered) {
      const tag = make("a", "tag page-tag", pageTitle(page));

      tag.href = `#${page.id}`;
      tags.append(tag);
    }

    cell.replaceChildren(tags);
  }

  // References, disclosed progressively. A linked phrase ([phrase](#D9)) takes its record's colour. A bracketed ID after a
  // claim moves into one marker at the end of its paragraph, list item or table cell: in prose only evidence moves (a
  // decision or question the sentence hasn't named stays until it's written as a phrase); in a cell everything does,
  // except what the row already lists. Two or more chips side by side, in a cell or on a diagram, become one counted
  // button. Each marker lists its records. The top bar's IDs switch puts the page back as written. Without the
  // script, every ID stays where it was written.

  const RECORD_ID = /^[EQDRP]\d+$/;
  const KIND_ORDER = ["D", "Q", "R", "E", "P"];
  const KIND_PLURALS = { D: "Decisions", Q: "Questions", R: "Requirements", E: "Evidence", P: "Deliverables" };
  const IDS_KEY = "design-docs-ids";
  const disclosed = new Map();

  const idOfLink = (link) => {
    const id = refIdOf(link);

    return id !== null && RECORD_ID.test(id) ? id : null;
  };

  const stateOf = (id) => (id.startsWith("D") ? decisionState(definitionFor(id)) : null);

  const isOpen = (id) => (id.startsWith("Q") && !(definitionFor(id)?.hasAttribute("data-answered") ?? false)) || ["open", "leaning"].includes(stateOf(id) ?? "");

  for (const phrase of document.querySelectorAll("a.mention.phrase")) {
    const id = idOfLink(phrase);

    if (id === null) continue;

    phrase.dataset.refId = id;
    phrase.dataset.kind = id[0].toLowerCase();

    if (id.startsWith("D")) phrase.dataset.state = stateOf(id);
  }

  const markerIcon = (kind) =>
    kind === "group"
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2.5" width="12" height="4" rx="1"/><rect x="2" y="9.5" width="12" height="4" rx="1"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 1.75h5.5L12.5 4.75v9.5h-8.5z"/><path d="M9.25 1.75v3.25h3.25M6 8.5h4.5M6 11h4.5"/></svg>';

  const marker = (ids, style) => {
    const button = make("button", "ref-marker");

    button.type = "button";
    button.dataset.marker = style;
    button.dataset.refs = ids.join(" ");
    button.title = ids.join(", ");

    if (ids.some(isOpen)) button.classList.add("has-open");

    const label = style === "sources" ? `${ids.length} ${ids.length === 1 ? "source" : "sources"}` : String(ids.length);

    button.innerHTML = `${markerIcon(style === "group" ? "group" : "sources")}<span>${label}</span>`;

    return button;
  };

  // Remember a container as written, the first time it changes, so the IDs switch can put it back.
  const remember = (container) => {
    if (!disclosed.has(container)) disclosed.set(container, { written: container.innerHTML, disclosed: "" });
  };

  // A bracketed run of mentions, "(E1, D2)", starting at its first link: the links, and the text nodes around them.
  const bracketAt = (first) => {
    const opening = first.previousSibling;

    if (opening?.nodeType !== Node.TEXT_NODE || !/\(\s*$/.test(opening.textContent)) return null;

    const links = [first];
    let cursor = first.nextSibling;

    while (cursor?.nodeType === Node.TEXT_NODE && /^\s*[,;]\s*$/.test(cursor.textContent) && cursor.nextSibling?.matches?.("a.mention")) {
      links.push(cursor.nextSibling);
      cursor = cursor.nextSibling.nextSibling;
    }

    if (cursor?.nodeType !== Node.TEXT_NODE || !cursor.textContent.startsWith(")")) return null;

    return { opening, links, closing: cursor };
  };

  // Take some of a bracket's links out of the text, keeping the rest in brackets; returns the IDs taken.
  const takeFromBracket = (bracket, take) => {
    const taken = bracket.links.filter((link) => take(idOfLink(link)));

    if (taken.length === 0) return [];

    const kept = bracket.links.filter((link) => !taken.includes(link));

    for (let node = bracket.opening.nextSibling; node !== bracket.closing; node = bracket.opening.nextSibling) node.remove();

    if (kept.length === 0) {
      bracket.opening.textContent = bracket.opening.textContent.replace(/\s*\(\s*$/, "");
      bracket.closing.textContent = bracket.closing.textContent.slice(1);
    } else {
      kept.forEach((link, index) => {
        if (index > 0) bracket.closing.before(", ");

        bracket.closing.before(link);
      });
    }

    return taken.map(idOfLink);
  };

  const discloseText = (container) => {
    const inCell = container.matches("td");
    const row = inCell ? container.closest("tr") : null;
    const listed = new Set();

    for (const chip of row?.querySelectorAll("a.ref") ?? []) {
      if (!container.contains(chip)) listed.add(idOfLink(chip));
    }

    const brackets = [];

    for (const link of container.querySelectorAll("a.mention:not(.phrase)")) {
      const bracket = idOfLink(link) === null ? null : bracketAt(link);

      if (bracket !== null && !brackets.some((known) => known.links.includes(link))) brackets.push(bracket);
    }

    const take = inCell ? () => true : (id) => id.startsWith("E");
    const plan = brackets.filter((bracket) => bracket.links.some((link) => take(idOfLink(link))));

    if (plan.length === 0) return;

    remember(container);

    const gathered = plan.flatMap((bracket) => takeFromBracket(bracket, take)).filter((id) => !listed.has(id));
    const ids = [...new Set(gathered)];

    if (ids.length > 0) container.append(" ", marker(ids, inCell || container.matches("li") ? "compact" : "sources"));
  };

  const collapseChips = (holder, chips) => {
    const ids = [...new Set(chips.map(idOfLink).filter((id) => id !== null))];

    if (ids.length < 2 || ids.length !== chips.length) return;

    remember(holder);

    for (const chip of chips) chip.remove();

    holder.append(marker(ids, "group"));
  };

  const onlyChips = (holder) =>
    holder.childElementCount > 1 && [...holder.childNodes].every((node) => (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "") || node.matches?.("a.ref"));

  const trailingChips = (cell) => {
    const chips = [];

    for (let node = cell.lastChild; node !== null; node = node.previousSibling) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "") continue;

      if (!node.matches?.("a.ref")) break;

      chips.unshift(node);
    }

    return chips;
  };

  const disclose = () => {
    for (const container of document.querySelectorAll(".doc p, .doc li, .doc td, .doc dd")) {
      // The innermost container holds the marker: a paragraph inside a cell keeps its own.
      if (container.matches("td") && container.querySelector("p, li") !== null) continue;

      if (container.closest(".diagram, .ref-list") === null) discloseText(container);
    }

    for (const pins of document.querySelectorAll(".diagram .pins")) collapseChips(pins, [...pins.querySelectorAll(":scope > a.ref")]);

    for (const cell of document.querySelectorAll(".doc td:not(.id)")) {
      for (const holder of [cell, ...cell.querySelectorAll(".marks")].filter(onlyChips)) collapseChips(holder, [...holder.querySelectorAll(":scope > a.ref")]);

      const trailing = trailingChips(cell);

      if (trailing.length >= 2) collapseChips(cell, trailing);
    }

    for (const [container, versions] of disclosed) versions.disclosed = container.innerHTML;
  };

  const showWritten = (written) => {
    root.classList.toggle("show-ids", written);

    for (const [container, versions] of disclosed) container.innerHTML = written ? versions.written : versions.disclosed;

    for (const button of document.querySelectorAll("[data-ids-toggle]")) button.setAttribute("aria-pressed", String(written));
  };

  // The marker's list: grouped by kind, each with its chip (which opens the record's card) and title.
  const refList = make("div", "ref-list");

  refList.hidden = true;
  document.body.append(refList);

  const titleOf = (id) => {
    const definition = definitionFor(id);
    const text = definition?.querySelector("[data-ref-text]") ?? definition?.querySelector(".dm-title, td:nth-child(2)") ?? null;

    const title = text === null ? "" : flatText(text).replace(new RegExp(`^${id}\\b\\s*·?\\s*`), "");

    // The list is for finding the right one; its card holds the rest.
    return title.length > 160 ? `${title.slice(0, 157).trimEnd()}…` : title;
  };

  const closeRefList = () => {
    refList.hidden = true;
    refList.dataset.for = "";
    document.body.append(refList);
  };

  const openRefList = (button) => {
    const ids = button.dataset.refs.split(" ");

    refList.replaceChildren();

    for (const kind of KIND_ORDER) {
      const ofKind = ids.filter((id) => id.startsWith(kind));

      if (ofKind.length === 0) continue;

      refList.append(make("div", "ref-list-head", KIND_PLURALS[kind]));

      for (const id of ofKind) {
        const row = make("div", "ref-list-row");
        const chip = make("a", `ref ref-${kind.toLowerCase()}`, id);

        chip.href = `#${id}`;

        if (kind === "D") chip.dataset.state = stateOf(id);

        row.append(chip, make("span", "", titleOf(id)));
        refList.append(row);
      }
    }

    // Inside an open modal everything else is inert, so the list moves in with it.
    (button.closest("dialog[open]") ?? document.body).append(refList);
    refList.hidden = false;
    refList.dataset.for = button.dataset.refs;

    const box = button.getBoundingClientRect();
    const width = Math.min(440, window.innerWidth - 24);
    const below = box.bottom + 8 + refList.offsetHeight <= window.innerHeight;

    refList.style.width = `${width}px`;
    refList.style.left = `${Math.max(12, Math.min(box.left - 16, window.innerWidth - width - 12))}px`;
    refList.style.top = `${below ? box.bottom + 8 : Math.max(12, box.top - 8 - refList.offsetHeight)}px`;
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("button.ref-marker");

    if (button !== null) {
      event.preventDefault();

      if (!refList.hidden && refList.dataset.for === button.dataset.refs) closeRefList();
      else openRefList(button);

      return;
    }

    if (!refList.hidden && !refList.contains(event.target) && !card.contains(event.target)) closeRefList();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !refList.hidden) closeRefList();
  });

  window.addEventListener("scroll", () => {
    if (!refList.hidden) closeRefList();
  }, { passive: true });

  disclose();

  if (disclosed.size > 0 || document.querySelector("a.mention.phrase") !== null) {
    const switchBox = make("div", "view-toggle ids-toggle");
    const idsButton = make("button", "", "IDs");

    idsButton.type = "button";
    idsButton.dataset.idsToggle = "";
    idsButton.title = "Show every record's ID where it was written";
    switchBox.append(idsButton);
    document.querySelector(".topbar [data-view-all]")?.before(switchBox);

    idsButton.addEventListener("click", () => {
      const written = !root.classList.contains("show-ids");

      try {
        localStorage.setItem(IDS_KEY, written ? "shown" : "");
      } catch {
        // Storage can be unavailable; the choice then lasts for this visit.
      }

      closeRefList();
      showWritten(written);
    });

    let storedIds = "";

    try {
      storedIds = localStorage.getItem(IDS_KEY) ?? "";
    } catch {
      storedIds = "";
    }

    if (params.get("ids") === "shown" || storedIds === "shown") showWritten(true);
    else showWritten(false);
  }

  // Snippets: a Copy button on each one with a header. A terminal session copies its commands, not the prompt or output.
  for (const caption of document.querySelectorAll(".snippet figcaption")) {
    const button = make("button", "copy", "Copy");

    button.type = "button";
    caption.append(button);
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest(".snippet .copy");

    if (button === null) return;

    const snippet = button.closest(".snippet");
    const code = snippet.querySelector("code");

    const text = snippet.classList.contains("session")
      ? [...code.querySelectorAll(".prompt")].map((prompt) => {
          let line = "";

          for (let node = prompt.nextSibling; node !== null && !(node instanceof Element && node.matches(".output, .prompt")); node = node.nextSibling) line += node.textContent;

          return line.split("\n")[0].trim();
        }).join("\n")
      : code.textContent;

    navigator.clipboard?.writeText(text).then(() => {
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    });
  });

  // Canvases: a map the reader pans by dragging and zooms with the buttons or Ctrl/⌘ and the wheel. It opens fitted to its
  // width; without the script it scrolls instead.
  for (const canvas of document.querySelectorAll("[data-canvas]")) {
    const viewport = canvas.querySelector(".canvas-viewport");
    const stage = canvas.querySelector(".diagram");
    const controls = canvas.querySelector(".canvas-controls");
    const level = canvas.querySelector(".zoom-level");

    if (viewport === null || stage === null || controls === null) continue;

    const width = Number(stage.style.getPropertyValue("--w"));
    const height = Number(stage.style.getPropertyValue("--h"));
    const view = { scale: 1, x: 0, y: 0 };

    controls.hidden = false;
    viewport.style.height = `${Math.min(height + 24, 640)}px`;

    const apply = () => {
      stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
      level.textContent = `${Math.round(view.scale * 100)}%`;
    };

    const zoomAt = (scale, cx, cy) => {
      const next = Math.min(2, Math.max(0.3, scale));

      view.x = cx - ((cx - view.x) / view.scale) * next;
      view.y = cy - ((cy - view.y) / view.scale) * next;
      view.scale = next;
      apply();
    };

    const fit = () => {
      const scale = Math.min(1, viewport.clientWidth / width, viewport.clientHeight / height);

      view.scale = scale;
      view.x = (viewport.clientWidth - width * scale) / 2;
      view.y = Math.max(0, (viewport.clientHeight - height * scale) / 2);
      apply();
    };

    controls.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-zoom]") : null;

      if (button === null) return;

      const centre = [viewport.clientWidth / 2, viewport.clientHeight / 2];

      if (button.dataset.zoom === "fit") fit();
      else zoomAt(view.scale * (button.dataset.zoom === "in" ? 1.2 : 1 / 1.2), ...centre);
    });

    viewport.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const box = viewport.getBoundingClientRect();

      zoomAt(view.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1), event.clientX - box.left, event.clientY - box.top);
    }, { passive: false });

    let drag = null;

    viewport.addEventListener("pointerdown", (event) => {
      if (event.target instanceof Element && event.target.closest("a, button, [data-detail]") !== null) return;

      drag = { x: event.clientX - view.x, y: event.clientY - view.y };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("dragging");
    });

    viewport.addEventListener("pointermove", (event) => {
      if (drag === null) return;

      view.x = event.clientX - drag.x;
      view.y = event.clientY - drag.y;
      apply();
    });

    const stop = () => {
      drag = null;
      viewport.classList.remove("dragging");
    };

    viewport.addEventListener("pointerup", stop);
    viewport.addEventListener("pointercancel", stop);

    // Fit once the canvas has a size: its page may be hidden until the reader opens it.
    new ResizeObserver((entries, observer) => {
      if (viewport.clientWidth === 0) return;

      fit();
      observer.disconnect();
    }).observe(viewport);
  }

  // The version menu closes when the reader clicks elsewhere.
  document.addEventListener("click", (event) => {
    for (const menu of document.querySelectorAll("details.versions[open]")) {
      if (!menu.contains(event.target)) menu.open = false;
    }
  });

  // Theme toggle: dark until the reader picks light

  // The top bar's sun and moon buttons ([data-theme-choice]); older shells have one [data-theme-toggle] button in the rail.
  const toggle = document.querySelector("[data-theme-toggle]");
  const choices = [...document.querySelectorAll("button[data-theme-choice]")];

  const readStoredTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  };

  const effectiveTheme = () => root.dataset.theme ?? "dark";

  const labelToggle = () => {
    const theme = effectiveTheme();

    if (toggle !== null) toggle.textContent = theme === "dark" ? "Light theme" : "Dark theme";

    for (const choice of choices) choice.setAttribute("aria-pressed", String(choice.dataset.themeChoice === theme));
  };

  const setTheme = (theme) => {
    root.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable (private windows, file:// pages); the choice then lasts for this visit.
    }

    labelToggle();
  };

  const storedTheme = readStoredTheme();

  if (storedTheme === "light" || storedTheme === "dark") root.dataset.theme = storedTheme;

  if (toggle !== null) toggle.addEventListener("click", () => setTheme(effectiveTheme() === "dark" ? "light" : "dark"));

  for (const choice of choices) choice.addEventListener("click", () => setTheme(choice.dataset.themeChoice === "dark" ? "dark" : "light"));

  labelToggle();

  // Architecture / Security views. Each option or solution card with view panels switches on its own;
  // [data-view-all] controls (the top bar's diagrams switch) switch every one at once.

  const VIEWS = new Set(["architecture", "security"]);
  const viewOptions = [];

  for (const option of document.querySelectorAll(".option")) {
    if (option.querySelector("[data-view-panel]") !== null) viewOptions.push(option);
  }

  const markPressed = (container, view) => {
    for (const button of container.querySelectorAll("button[data-view]")) {
      button.setAttribute("aria-pressed", String(button.dataset.view === view));
    }
  };

  const showView = (option, view) => {
    option.dataset.view = view;
    markPressed(option, view);
  };

  const showViewEverywhere = (view) => {
    for (const option of viewOptions) showView(option, view);

    for (const control of document.querySelectorAll("[data-view-all]")) markPressed(control, view);
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("button[data-view]");
    const view = button === null ? "" : button.dataset.view;

    if (button === null || !VIEWS.has(view)) return;

    const option = button.closest(".option");

    if (button.closest("[data-view-all]") !== null || option === null) {
      showViewEverywhere(view);
    } else {
      showView(option, view);
    }
  });

  const requestedView = params.get("view") ?? root.dataset.defaultView ?? "architecture";

  showViewEverywhere(VIEWS.has(requestedView) ? requestedView : "architecture");
  root.classList.add("js");

  // Starting page: ?page=, else the page holding the #fragment, else the first page.

  const hashTarget = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const requestedPage = document.getElementById(params.get("page") ?? "");
  let startPage = pages[0] ?? null;

  if (requestedPage !== null && requestedPage.matches("article.page")) {
    startPage = requestedPage;
  } else if (hashTarget !== null && pageOf(hashTarget) !== null) {
    startPage = pageOf(hashTarget);
  }

  if (multiPage) {
    showPage(startPage);

    window.addEventListener("popstate", () => {
      const page = document.getElementById(new URLSearchParams(location.search).get("page") ?? "");

      showPage(page !== null && page.matches("article.page") ? page : pages[0]);
    });
  } else {
    if (startPage !== null) showCurrentPage(startPage);
    collectNav();
    markCurrent();
  }

  // ?card=E2 opens that item's card at its first visible reference (useful for review screenshots).
  // Arriving with a #fragment reveals that item instead.

  const requestedCard = params.get("card");

  if (requestedCard !== null && definitionFor(requestedCard) !== null) {
    const selector = ["a.ref", "a.mention", "a.flow"].map((kind) => `${kind}[href="#${requestedCard}"]`).join(", ");
    let trigger = null;

    for (const link of document.querySelectorAll(selector)) {
      if (trigger === null && link.getClientRects().length > 0) trigger = link;
    }

    // Only look on other pages when no page was asked for.
    if (trigger === null && multiPage && requestedPage === null) {
      const elsewhere = document.querySelector(selector);

      if (elsewhere !== null && pageOf(elsewhere) !== null) {
        showPage(pageOf(elsewhere));
        trigger = elsewhere;
      }
    }

    if (trigger !== null) {
      trigger.scrollIntoView({ block: "center", behavior: "instant" });
      openCard(trigger, requestedCard);
    }
  } else if (hashTarget !== null && !hashTarget.matches("article.page")) {
    reveal(hashTarget.id);
  }
})();
