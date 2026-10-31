// The memory tree on an infinite canvas. Messages sit along the bottom row in order. A node (l, i) covers the
// 2^l messages from i·2^l on, and is drawn as a leaf scaled by 2^l directly above them: zoomed out, the top
// summaries are readable; zooming into a region brings the finer summaries and messages under it into view.

const SLOT = 360

const GAP_X = 16

const GAP_Y = 44

const BOX = 200

const PAD = 10

const FONT = 12

const LINE = 16

const MIN_TEXT_PX = 5

const MAX_ZOOM = 4

const FILL = {
  user: "#3d5f8f",
  agent: "#3f7a55",
  tool: "#5a4a7a",
  echo: "#3c4350",
  work: "#7a5a35",
  note: "#6e3f4f",
  summary: "#2b313b",
}

const canvas = document.querySelector("#canvas")

const context = canvas.getContext("2d")

const elements = {
  chatList: document.querySelector("#chat-list"),
  dataDir: document.querySelector("#data-dir"),
  toolbar: document.querySelector("#toolbar"),
  legend: document.querySelector("#legend"),
  empty: document.querySelector("#empty"),
  chatName: document.querySelector("#chat-name"),
  chatStats: document.querySelector("#chat-stats"),
  search: document.querySelector("#search"),
  searchCount: document.querySelector("#search-count"),
  detail: document.querySelector("#detail"),
  detailLabel: document.querySelector("#detail-label"),
  detailMeta: document.querySelector("#detail-meta"),
  detailText: document.querySelector("#detail-text"),
  goParent: document.querySelector("#go-parent"),
  goLeft: document.querySelector("#go-left"),
  goRight: document.querySelector("#go-right"),
}

const state = {
  chats: [],
  chat: undefined,
  nodes: new Map(),
  levels: 0,
  inView: new Set(),
  inCompaction: new Set(),
  selected: undefined,
  matches: [],
  matchSet: new Set(),
  matchPosition: -1,
  camera: { x: 0, y: 0, k: 1 },
  wraps: new Map(),
  frame: 0,
  animation: 0,
}

// Tree arithmetic, as in tree.ts.

const key = (l, i) => `${l}:${i}`

const first = (l, i) => i * 2 ** l

const last = (l, i) => first(l, i) + 2 ** l - 1

const label = (l, i) => `${first(l, i)}+${2 ** l}`

const exists = (l, i) => (l === 0 ? i >= 0 && i < state.chat.messages.length : state.nodes.has(key(l, i)))

const nodeText = (l, i) => state.nodes.get(key(l, i))?.text ?? (l === 0 ? state.chat.messages[i]?.preview : undefined) ?? ""

// Layout. Every level is the leaf row scaled by 2^l, gaps included, so level l starts (2^(l+1) - 2) leaf rows up.

const rowTop = (l) => -(2 ** (l + 1) - 2) * (BOX + GAP_Y)

const box = (l, i) => {
  const s = 2 ** l

  return { x: (i * SLOT + GAP_X / 2) * s, y: rowTop(l), w: (SLOT - GAP_X) * s, h: BOX * s, s }
}

const treeBounds = () => ({
  x: 0,
  y: rowTop(state.levels),
  w: Math.max(1, state.chat.messages.length) * SLOT,
  h: BOX - rowTop(state.levels),
})

// Helpers

const api = async (path) => {
  const response = await fetch(path)

  if (!response.ok) throw new Error(`${path}: ${response.status}`)

  return response.json()
}

const formatDate = (iso) => (iso === undefined ? "" : new Date(iso).toLocaleString())

const count = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

// Chat list

const renderChatList = () => {
  elements.chatList.replaceChildren()

  for (const chat of state.chats) {
    const item = document.createElement("li")
    const name = document.createElement("div")
    const opening = document.createElement("div")
    const meta = document.createElement("div")

    name.className = chat.name === null ? "name unnamed" : "name"
    name.textContent = chat.name ?? chat.id
    opening.className = "opening"
    opening.textContent = chat.opening
    meta.className = "meta"
    meta.textContent = `${count(chat.messages, "message")} · ${formatDate(chat.lastActiveAt)}`
    item.title = chat.directory
    item.classList.toggle("active", chat.id === state.chat?.id)
    item.append(name, opening, meta)
    item.addEventListener("click", () => {
      location.hash = `#/${encodeURIComponent(chat.id)}`
    })

    elements.chatList.append(item)
  }

  if (state.chats.length === 0) {
    const item = document.createElement("li")

    item.className = "unnamed"
    item.textContent = "No chats yet."
    elements.chatList.append(item)
  }
}

const loadChats = async () => {
  const { dataDir, chats } = await api("/api/chats")

  state.chats = chats
  elements.dataDir.textContent = dataDir
  renderChatList()
}

// Chat tree

const loadChat = async (id, { keepCamera = false } = {}) => {
  const chat = await api(`/api/chats/${encodeURIComponent(id)}`)

  state.chat = chat
  state.nodes = new Map(chat.nodes.map((node) => [key(node.l, node.i), node]))
  state.levels = Math.max(0, ...chat.nodes.map((node) => node.l))
  state.inView = new Set(chat.view.map(([l, i]) => key(l, i)))
  state.inCompaction = new Set(chat.compaction.map(([l, i]) => key(l, i)))
  state.wraps.clear()

  const stillThere = keepCamera && state.selected !== undefined && exists(state.selected.l, state.selected.i)

  if (!stillThere) state.selected = undefined

  elements.toolbar.hidden = false
  elements.legend.hidden = false
  elements.empty.hidden = chat.messages.length > 0
  elements.empty.textContent = "This chat has no messages yet."
  elements.chatName.textContent = chat.name ?? chat.id

  elements.chatStats.textContent = [
    count(chat.messages.length, "message"),
    count(chat.nodes.filter((node) => node.l > 0).length, "summary", "summaries"),
    `view ${count(chat.view.length, "line")}`,
    `compaction view ${count(chat.compaction.length, "line")}`,
    count(chat.subagents.length, "subagent"),
  ].join(" · ")

  renderChatList()
  updateSearch()
  renderDetail()

  if (!keepCamera) fitAll(false)

  redraw()
}

const route = async () => {
  const id = decodeURIComponent(location.hash.replace(/^#\//, ""))

  if (id === "") return

  try {
    await loadChat(id)
  } catch (error) {
    elements.empty.hidden = false
    elements.empty.textContent = `Couldn't load ${id}: ${error.message}`
  }
}

// Camera: screen = world · k + (x, y)

const viewport = () => ({ w: canvas.clientWidth, h: canvas.clientHeight })

const toWorld = (sx, sy) => ({ x: (sx - state.camera.x) / state.camera.k, y: (sy - state.camera.y) / state.camera.k })

const clampZoom = (k) => Math.min(MAX_ZOOM, Math.max(1e-6, k))

const moveCamera = (target, animate) => {
  cancelAnimationFrame(state.animation)

  if (!animate) {
    state.camera = target
    redraw()

    return
  }

  const from = { ...state.camera }
  const start = performance.now()
  const { w, h } = viewport()
  const fromCenter = { x: (w / 2 - from.x) / from.k, y: (h / 2 - from.y) / from.k }
  const toCenter = { x: (w / 2 - target.x) / target.k, y: (h / 2 - target.y) / target.k }

  const step = (now) => {
    const t = Math.min(1, (now - start) / 320)
    const ease = 1 - (1 - t) ** 3
    const k = from.k * (target.k / from.k) ** ease
    const cx = fromCenter.x + (toCenter.x - fromCenter.x) * ease
    const cy = fromCenter.y + (toCenter.y - fromCenter.y) * ease

    state.camera = { k, x: w / 2 - cx * k, y: h / 2 - cy * k }
    redraw()

    if (t < 1) state.animation = requestAnimationFrame(step)
  }

  state.animation = requestAnimationFrame(step)
}

const fitRect = (rect, margin = 32) => {
  const { w, h } = viewport()
  const k = clampZoom(Math.min((w - margin * 2) / rect.w, (h - margin * 2) / rect.h))

  return { k, x: w / 2 - (rect.x + rect.w / 2) * k, y: h / 2 - (rect.y + rect.h / 2) * k }
}

const fitAll = (animate = true) => {
  if (state.chat !== undefined) moveCamera(fitRect(treeBounds()), animate)
}

/** The newest messages at reading size. */
const showLatest = (animate = true) => {
  if (state.chat === undefined) return

  const { w, h } = viewport()
  const k = 0.9
  const right = treeBounds().w

  moveCamera({ k, x: Math.min(32, w - 32 - right * k), y: h - 64 - BOX * k }, animate)
}

/** Frames a node with its parent's gap above and its children below. */
const focusNode = (l, i) => {
  const rect = box(l, i)
  const below = l === 0 ? GAP_Y : GAP_Y * rect.s + BOX * (rect.s / 2)

  moveCamera(fitRect({ x: rect.x, y: rect.y - GAP_Y * rect.s, w: rect.w, h: rect.h + GAP_Y * rect.s + below }), true)
}

const revealNode = (l, i) => {
  const rect = box(l, i)
  const { w, h } = viewport()
  const { x, y, k } = state.camera
  const left = rect.x * k + x
  const top = rect.y * k + y
  const onScreen = left + rect.w * k > 0 && left < w && top + rect.h * k > 0 && top < h
  const legible = FONT * rect.s * k >= MIN_TEXT_PX

  if (!onScreen || !legible) focusNode(l, i)
}

// Drawing

const redraw = () => {
  if (state.frame === 0) state.frame = requestAnimationFrame(draw)
}

/** Lines of a node's text, in leaf units; the scale is applied when drawing. */
const wrap = (l, i) => {
  const id = key(l, i)
  const cached = state.wraps.get(id)

  if (cached !== undefined) return cached

  const width = SLOT - GAP_X - PAD * 2
  const lines = []

  context.font = `${FONT}px ui-sans-serif, system-ui, sans-serif`

  for (const paragraph of nodeText(l, i).split("\n")) {
    let line = ""

    for (const word of paragraph.split(/\s+/)) {
      const next = line === "" ? word : `${line} ${word}`

      if (line === "" || context.measureText(next).width <= width) {
        line = next

        continue
      }

      lines.push(line)
      line = word
    }

    lines.push(line)
  }

  state.wraps.set(id, lines)

  return lines
}

const drawEdges = (l, i0, i1) => {
  context.beginPath()

  for (let i = i0; i <= i1; i++) {
    if (!exists(l, i)) continue

    const parent = box(l, i)
    const x0 = parent.x + parent.w / 2
    const y0 = parent.y + parent.h

    for (const child of [2 * i, 2 * i + 1]) {
      if (!exists(l - 1, child)) continue

      const target = box(l - 1, child)
      const x1 = target.x + target.w / 2
      const y1 = target.y
      const mid = (y0 + y1) / 2

      context.moveTo(x0, y0)
      context.bezierCurveTo(x0, mid, x1, mid, x1, y1)
    }
  }

  context.stroke()
}

const drawText = (l, i, rect) => {
  const lines = wrap(l, i)
  const room = Math.floor((BOX - PAD * 2 - LINE - 4) / LINE)
  const kind = l === 0 ? state.chat.messages[i]?.kind ?? "" : `level ${l}`

  context.save()
  context.translate(rect.x, rect.y)
  context.scale(rect.s, rect.s)
  context.fillStyle = "#9aa3b0"
  context.font = `600 ${FONT}px ui-monospace, monospace`
  context.fillText(`${label(l, i)}  ${kind}`, PAD, PAD + FONT)
  context.fillStyle = "#e3e6eb"
  context.font = `${FONT}px ui-sans-serif, system-ui, sans-serif`

  for (let line = 0; line < Math.min(room, lines.length); line++) {
    const truncated = line === room - 1 && lines.length > room
    const text = lines[line] ?? ""

    context.fillText(truncated ? `${text.slice(0, -1)}…` : text, PAD, PAD + LINE + 4 + FONT + line * LINE)
  }

  context.restore()
}

const drawNode = (l, i) => {
  const id = key(l, i)
  const rect = box(l, i)
  const { k } = state.camera

  context.globalAlpha = state.matchSet.size > 0 && !state.matchSet.has(id) ? 0.35 : 1
  context.fillStyle = l === 0 ? FILL[state.chat.messages[i]?.kind] ?? FILL.summary : FILL.summary
  context.fillRect(rect.x, rect.y, rect.w, rect.h)

  // Outlines keep a constant on-screen width and inset at any zoom.
  const outline = (color, width, dash, inset) => {
    const room = Math.min(inset / k, rect.w / 4, rect.h / 4)

    context.strokeStyle = color
    context.lineWidth = width / k
    context.setLineDash(dash.map((part) => part / k))
    context.strokeRect(rect.x + room, rect.y + room, rect.w - 2 * room, rect.h - 2 * room)
    context.setLineDash([])
  }

  if (state.inView.has(id)) outline("#e8b44c", 2, [], 1)

  if (state.inCompaction.has(id)) outline("#5cc8d6", 2, [6, 4], 5)

  if (state.matchSet.has(id)) outline("#f2e27a", 1.5, [], 9)

  if (state.selected?.l === l && state.selected.i === i) outline("#ffffff", 3, [], -3)

  if (FONT * rect.s * k >= MIN_TEXT_PX) drawText(l, i, rect)

  context.globalAlpha = 1
}

const draw = () => {
  state.frame = 0

  const dpr = window.devicePixelRatio || 1
  const { w, h } = viewport()

  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, w, h)

  if (state.chat === undefined || state.chat.messages.length === 0) return

  const { x, y, k } = state.camera

  context.setTransform(k * dpr, 0, 0, k * dpr, x * dpr, y * dpr)

  const topLeft = toWorld(0, 0)
  const bottomRight = toWorld(w, h)
  const messages = state.chat.messages.length

  // Each level's visible index range follows from the layout, so only on-screen nodes are touched.
  const ranges = []

  for (let l = 0; l <= state.levels; l++) {
    const s = 2 ** l
    const slot = SLOT * s
    const top = rowTop(l)
    const bottom = top + BOX * s + GAP_Y * s
    const tooSmall = (SLOT - GAP_X) * s * k < 0.5

    if (tooSmall || bottom < topLeft.y || top > bottomRight.y) continue

    const i0 = Math.max(0, Math.floor(topLeft.x / slot))
    const i1 = Math.min(Math.floor((messages - 1) / s), Math.floor(bottomRight.x / slot))

    ranges.push({ l, i0, i1 })
  }

  context.strokeStyle = "#4a515e"
  context.lineWidth = 1.5 / k

  for (const range of ranges) {
    if (range.l > 0) drawEdges(range.l, range.i0, range.i1)
  }

  for (const range of ranges) {
    for (let i = range.i0; i <= range.i1; i++) {
      if (exists(range.l, i)) drawNode(range.l, i)
    }
  }
}

// Selection and detail panel

const hit = (sx, sy) => {
  const point = toWorld(sx, sy)

  for (let l = 0; l <= state.levels; l++) {
    const i = Math.floor(point.x / (SLOT * 2 ** l))
    const rect = box(l, i)
    const inside = point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h

    if (inside && exists(l, i)) return { l, i }
  }

  return undefined
}

const select = (entry, { reveal = true } = {}) => {
  state.selected = entry
  renderDetail()

  if (entry !== undefined && reveal) revealNode(entry.l, entry.i)

  redraw()
}

const renderDetail = async () => {
  const entry = state.selected

  elements.detail.hidden = entry === undefined

  if (entry === undefined) return

  const { l, i } = entry
  const messages = state.chat.messages
  const from = first(l, i)
  const to = Math.min(last(l, i), messages.length - 1)
  const parent = { l: l + 1, i: Math.floor(i / 2) }

  const membership = [state.inView.has(key(l, i)) ? "in view" : "", state.inCompaction.has(key(l, i)) ? "in compaction view" : ""]
    .filter((part) => part !== "")
    .join(", ")

  const range = l === 0 ? `message ${from}` : `messages ${from}–${to} (level ${l})`
  const dates = from === to ? formatDate(messages[from]?.date) : `${formatDate(messages[from]?.date)} → ${formatDate(messages[to]?.date)}`

  elements.detailLabel.textContent = label(l, i)
  elements.detailMeta.textContent = [range, dates, membership].filter((part) => part !== "").join(" · ")
  elements.detailText.textContent = nodeText(l, i)
  elements.goParent.disabled = !exists(parent.l, parent.i)
  elements.goLeft.disabled = l === 0 || !exists(l - 1, 2 * i)
  elements.goRight.disabled = l === 0 || !exists(l - 1, 2 * i + 1)

  if (l > 0) return

  try {
    const message = await api(`/api/chats/${encodeURIComponent(state.chat.id)}/messages/${i}`)

    // Ignore the reply if the selection moved on while it loaded.
    if (state.selected !== entry) return

    elements.detailMeta.textContent = [`message ${i}`, message.kind, count(message.size, "byte"), formatDate(message.date), membership]
      .filter((part) => part !== "")
      .join(" · ")

    elements.detailText.textContent = message.text
  } catch (error) {
    elements.detailText.textContent = `${nodeText(l, i)}\n\n(Couldn't load the full message: ${error.message})`
  }
}

const go = (direction) => {
  const entry = state.selected

  if (entry === undefined) return

  const next = {
    parent: { l: entry.l + 1, i: Math.floor(entry.i / 2) },
    left: { l: entry.l - 1, i: entry.i * 2 },
    right: { l: entry.l - 1, i: entry.i * 2 + 1 },
  }[direction]

  if (next.l >= 0 && exists(next.l, next.i)) select(next)
}

// Search

const updateSearch = () => {
  const query = elements.search.value.trim().toLowerCase()

  state.matches = []

  if (query !== "" && state.chat !== undefined) {
    for (let i = 0; i < state.chat.messages.length; i++) {
      if (nodeText(0, i).toLowerCase().includes(query)) state.matches.push({ l: 0, i })
    }

    for (const node of state.chat.nodes) {
      if (node.l > 0 && node.text.toLowerCase().includes(query)) state.matches.push({ l: node.l, i: node.i })
    }

    // Coarsest first at each position, so stepping through reads top-down.
    state.matches.sort((a, b) => first(a.l, a.i) - first(b.l, b.i) || b.l - a.l)
  }

  state.matchSet = new Set(state.matches.map((entry) => key(entry.l, entry.i)))
  state.matchPosition = -1
  elements.searchCount.textContent = query === "" ? "" : count(state.matches.length, "match", "matches")
  redraw()
}

const nextMatch = (step) => {
  if (state.matches.length === 0) return

  state.matchPosition = (state.matchPosition + step + state.matches.length) % state.matches.length

  const entry = state.matches[state.matchPosition]

  elements.searchCount.textContent = `${state.matchPosition + 1} / ${state.matches.length}`
  select(entry, { reveal: false })
  focusNode(entry.l, entry.i)
}

// Input

const pointer = { down: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0 }

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId)
  cancelAnimationFrame(state.animation)
  Object.assign(pointer, { down: true, moved: false, startX: event.offsetX, startY: event.offsetY, lastX: event.offsetX, lastY: event.offsetY })
})

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.down) return

  if (Math.hypot(event.offsetX - pointer.startX, event.offsetY - pointer.startY) > 4) {
    pointer.moved = true
    canvas.classList.add("dragging")
  }

  state.camera = { ...state.camera, x: state.camera.x + event.offsetX - pointer.lastX, y: state.camera.y + event.offsetY - pointer.lastY }
  pointer.lastX = event.offsetX
  pointer.lastY = event.offsetY
  redraw()
})

canvas.addEventListener("pointerup", (event) => {
  pointer.down = false
  canvas.classList.remove("dragging")

  if (!pointer.moved && state.chat !== undefined) select(hit(event.offsetX, event.offsetY), { reveal: false })
})

canvas.addEventListener("dblclick", (event) => {
  const entry = hit(event.offsetX, event.offsetY)

  if (entry !== undefined) focusNode(entry.l, entry.i)
})

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault()
    cancelAnimationFrame(state.animation)

    const { x, y, k } = state.camera

    // Horizontal trackpad scrolls and Shift+wheel pan; everything else zooms around the cursor.
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      state.camera = { k, x: x - (event.deltaX || event.deltaY), y }
      redraw()

      return
    }

    const scale = event.deltaMode === 1 ? 0.05 : 0.0015
    const next = clampZoom(k * Math.exp(-event.deltaY * scale))
    const point = toWorld(event.offsetX, event.offsetY)

    state.camera = { k: next, x: event.offsetX - point.x * next, y: event.offsetY - point.y * next }
    redraw()
  },
  { passive: false },
)

window.addEventListener("keydown", (event) => {
  if (event.target === elements.search) {
    if (event.key === "Enter") nextMatch(event.shiftKey ? -1 : 1)

    if (event.key === "Escape") elements.search.blur()

    return
  }

  const actions = {
    Escape: () => select(undefined),
    ArrowUp: () => go("parent"),
    ArrowLeft: () => go("left"),
    ArrowRight: () => go("right"),
    f: () => fitAll(),
    l: () => showLatest(),
    "/": () => elements.search.focus(),
  }

  const action = actions[event.key]

  if (action !== undefined && state.chat !== undefined) {
    event.preventDefault()
    action()
  }
})

elements.search.addEventListener("input", updateSearch)

document.querySelector("#fit").addEventListener("click", () => fitAll())

document.querySelector("#latest").addEventListener("click", () => showLatest())

document.querySelector("#detail-close").addEventListener("click", () => select(undefined))

elements.goParent.addEventListener("click", () => go("parent"))

elements.goLeft.addEventListener("click", () => go("left"))

elements.goRight.addEventListener("click", () => go("right"))

document.querySelector("#reload").addEventListener("click", async () => {
  await loadChats()

  if (state.chat !== undefined) await loadChat(state.chat.id, { keepCamera: true })
})

new ResizeObserver(redraw).observe(canvas)

window.addEventListener("hashchange", route)

try {
  await loadChats()
  await route()
} catch (error) {
  elements.empty.textContent = `Couldn't reach the viewer server: ${error.message}`
}
