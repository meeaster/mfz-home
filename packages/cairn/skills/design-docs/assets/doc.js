// Design doc behaviour: pages, reference cards, rail section tracking, views, and the theme toggle.
// The page stays usable without this script: pages follow one another and references are plain in-page links.
(() => {
  const KIND_LABELS = {
    evidence: "Evidence",
    question: "Question",
    decision: "Decision",
    requirement: "Requirement",
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

  // "Cited on": for items on shared pages, list the other pages that refer to them,
  // and let the page's rail filter the list to one of those pages.

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
    definition.dataset.citedBy = ordered.map((page) => page.id).join(" ");
  }

  for (const filter of document.querySelectorAll(".cite-filter")) {
    const home = document.getElementById(filter.closest(".page-rail")?.dataset.page ?? "");

    if (home === null) continue;

    const rows = [];

    for (const row of home.querySelectorAll("[data-ref][data-cited-by]")) rows.push(row);

    const counts = new Map();

    for (const row of rows) {
      for (const pageId of row.dataset.citedBy.split(" ")) {
        if (pageId !== "") counts.set(pageId, (counts.get(pageId) ?? 0) + 1);
      }
    }

    const buttons = [];

    const addButton = (pageId, label, count) => {
      const button = make("button", "");

      button.type = "button";
      button.dataset.filter = pageId;
      button.append(make("span", "n", String(count)), make("span", "", label));
      buttons.push(button);
      filter.append(button);
    };

    addButton("", "All pages", rows.length);

    for (const page of pages) {
      if (counts.has(page.id)) addButton(page.id, pageTitle(page), counts.get(page.id));
    }

    const applyFilter = (pageId) => {
      for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.filter === pageId));

      for (const row of rows) row.hidden = pageId !== "" && !row.dataset.citedBy.split(" ").includes(pageId);
    };

    filter.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-filter]") : null;

      if (button !== null) applyFilter(button.dataset.filter);
    });
    applyFilter("");
  }

  // Theme toggle: follows the system until the reader picks one

  // The top bar's sun and moon buttons ([data-theme-choice]); older shells have one [data-theme-toggle] button in the rail.
  const toggle = document.querySelector("[data-theme-toggle]");
  const choices = [...document.querySelectorAll("button[data-theme-choice]")];
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  const readStoredTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  };

  const effectiveTheme = () => root.dataset.theme ?? (systemDark.matches ? "dark" : "light");

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

  systemDark.addEventListener("change", labelToggle);
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
