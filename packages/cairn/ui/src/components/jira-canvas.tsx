import { ArrowUpRightIcon, MinusIcon, PlusIcon, RouteIcon, SquareCheckIcon, ZapIcon } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from "react";
import { Button } from "@/components/ui/button";
import type { DeliverableRef, JiraItem } from "@/lib/api";
import { cn } from "@/lib/utils";

// One lane per epic, as Jira groups the work, with its stories in it and Jira's blocks links as arrows. A lane names
// the plan deliverable its epic delivers when a design links the epic; Cairn stores no mapping of its own.

const PAD = 20;

const LANE_WIDTH = 246;

const LANE_GAP = 32;

const HEAD_HEIGHT = 92;

const CARD_X = 12;

const CARD_WIDTH = 222;

const CARD_HEIGHT = 74;

const CARD_GAP = 10;

const POPOVER_WIDTH = 300;

const pill: Readonly<Record<NonNullable<JiraItem["category"]>, string>> = {
  done: "bg-ok-muted text-ok",
  progress: "bg-cat-deliverable/15 text-cat-deliverable",
  todo: "bg-muted text-muted-foreground"
};

function isEpic(item: JiraItem): boolean {
  return item.type?.toLowerCase() === "epic";
}

export function JiraStatus({ item }: { readonly item: JiraItem }) {
  if (item.status === null) {
    return null;
  }

  return <span className={cn("shrink-0 rounded px-1.5 py-px text-[11px] font-semibold", pill[item.category ?? "todo"])}>{item.status}</span>;
}

export function deliverableLabel(deliverable: DeliverableRef): string {
  return `${deliverable.id} · ${deliverable.title} in ${deliverable.design_title}`;
}

type Lane = { readonly epic: JiraItem | null; readonly items: readonly JiraItem[] };

function lanesOf(items: readonly JiraItem[]): Lane[] {
  const epics = items.filter(isEpic);
  const order = (epic: JiraItem) => [epic.delivers === null ? Number.POSITIVE_INFINITY : Number(epic.delivers.id.slice(1)), epic.key] as const;

  epics.sort((a, b) => {
    const [left, leftKey] = order(a);
    const [right, rightKey] = order(b);

    return left - right || leftKey.localeCompare(rightKey);
  });

  const keys = new Set(epics.map((epic) => epic.key));
  const lanes: Lane[] = epics.map((epic) => ({ epic, items: items.filter((item) => !isEpic(item) && item.parent === epic.key) }));
  const loose = items.filter((item) => !isEpic(item) && (item.parent === null || !keys.has(item.parent)));

  return loose.length > 0 ? [...lanes, { epic: null, items: loose }] : lanes;
}

type Placed = { readonly item: JiraItem; readonly x: number; readonly y: number };

type View = { readonly scale: number; readonly x: number; readonly y: number };

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function Popover({ placed, items, onClose }: { readonly placed: Placed; readonly items: readonly JiraItem[]; readonly onClose: () => void }) {
  const { item } = placed;
  const byKey = new Map(items.map((other) => [other.key, other]));
  const epic = item.parent === null ? undefined : byKey.get(item.parent);
  const delivers = item.delivers ?? epic?.delivers ?? null;
  const blockedBy = items.filter((other) => other.blocks.includes(item.key));
  const named = (key: string) => `${key}${byKey.get(key)?.title ? ` · ${byKey.get(key)?.title}` : ""}`;

  return (
    <div
      role="dialog"
      aria-label={item.key}
      className="absolute z-10 flex flex-col overflow-hidden rounded-lg border bg-card text-sm shadow-lg"
      style={{ left: placed.x + CARD_WIDTH + 14, top: placed.y - 8, width: POPOVER_WIDTH }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold">{item.key}</span>
        <span className="text-muted-foreground">{item.type ?? "Item"}</span>
        <span className="ml-auto" />
        <JiraStatus item={item} />
        <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <p className="font-semibold">{item.title ?? item.key}</p>
        {item.parent !== null && <Row label="Epic">{named(item.parent)}</Row>}
        {delivers !== null && (
          <Row label="Delivers">
            {deliverableLabel(delivers)}
            {item.delivers === null && <span className="text-muted-foreground"> (from its epic)</span>}
          </Row>
        )}
        {blockedBy.length > 0 && <Row label="Blocked by">{blockedBy.map((other) => named(other.key)).join(", ")}</Row>}
        {item.blocks.length > 0 && <Row label="Blocks">{item.blocks.map(named).join(", ")}</Row>}
        {item.description !== null && <Row label="Why">{item.description}</Row>}
      </div>
      <div className="flex justify-end border-t bg-muted px-3.5 py-2">
        <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium hover:underline">
          Open in Jira
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

export function JiraCanvas({ items }: { readonly items: readonly JiraItem[] }) {
  const lanes = lanesOf(items);
  const deepest = Math.max(1, ...lanes.map((lane) => lane.items.length));
  const width = PAD * 2 + lanes.length * LANE_WIDTH + (lanes.length - 1) * LANE_GAP;
  const height = PAD * 2 + HEAD_HEIGHT + deepest * (CARD_HEIGHT + CARD_GAP);
  const placed = new Map<string, Placed>();

  lanes.forEach((lane, index) => {
    lane.items.forEach((item, position) => {
      placed.set(item.key, { item, x: PAD + index * (LANE_WIDTH + LANE_GAP) + CARD_X, y: PAD + HEAD_HEIGHT + position * (CARD_HEIGHT + CARD_GAP) });
    });
  });

  // Blocks arrows: from the blocking item's side to the blocked one's, around the lane gap.
  const edges: string[] = [];

  for (const { item, x, y } of placed.values()) {
    for (const key of item.blocks) {
      const target = placed.get(key);

      if (target === undefined) continue;

      const y1 = y + CARD_HEIGHT / 2;
      const y2 = target.y + CARD_HEIGHT / 2;

      if (target.x > x) {
        const middle = x + CARD_WIDTH + (target.x - x - CARD_WIDTH) / 2;

        edges.push(`M${x + CARD_WIDTH} ${y1} H${middle} V${y2} H${target.x - 1}`);
      } else {
        const outside = Math.max(x, target.x) + CARD_WIDTH + 10;

        edges.push(`M${x + CARD_WIDTH} ${y1} H${outside} V${y2} H${target.x + CARD_WIDTH + 1}`);
      }
    }
  }

  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const viewportHeight = Math.min(height + 8, 640);

  const fit = () => {
    const box = viewport.current;

    if (box === null) return;

    const scale = Math.min(1, box.clientWidth / width, viewportHeight / height);

    setView({ scale, x: Math.max(0, (box.clientWidth - width * scale) / 2), y: 0 });
  };

  useEffect(fit, [width, height]);

  const zoom = (factor: number, cx: number, cy: number) =>
    setView((current) => {
      const scale = Math.min(2, Math.max(0.3, current.scale * factor));

      return { scale, x: cx - ((cx - current.x) / current.scale) * scale, y: cy - ((cy - current.y) / current.scale) * scale };
    });

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();

    const box = event.currentTarget.getBoundingClientRect();

    zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - box.left, event.clientY - box.top);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button, a, [data-card]") !== null) return;

    drag.current = { x: event.clientX - view.x, y: event.clientY - view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(null);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;

    if (start === null) return;

    setView((current) => ({ ...current, x: event.clientX - start.x, y: event.clientY - start.y }));
  };

  const centre = (): [number, number] => [(viewport.current?.clientWidth ?? 0) / 2, viewportHeight / 2];
  const open = selected === null ? undefined : placed.get(selected);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={viewport}
        className="relative cursor-grab touch-none overflow-hidden rounded-xl border bg-muted active:cursor-grabbing"
        style={{ height: viewportHeight }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <div className="absolute origin-top-left" style={{ width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
          {lanes.map((lane, index) => (
            <div
              key={lane.epic?.key ?? "no-epic"}
              className={cn("absolute flex flex-col gap-1.5 rounded-xl border bg-background px-3.5 pt-3.5", lane.epic !== null && "border-cat-synthesis/60")}
              style={{ left: PAD + index * (LANE_WIDTH + LANE_GAP), top: PAD, width: LANE_WIDTH, height: height - PAD * 2 }}
            >
              {lane.epic === null ? (
                <>
                  <span className="text-sm font-semibold">No epic</span>
                  <span className="text-xs text-muted-foreground">Items linked to this effort that sit under no epic it holds</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-xs">
                    <ZapIcon className="size-3 text-cat-synthesis" />
                    <a href={lane.epic.url} target="_blank" rel="noreferrer" className="font-mono font-semibold text-cat-synthesis hover:underline">
                      {lane.epic.key}
                    </a>
                    <span className="text-muted-foreground">Epic</span>
                    <span className="ml-auto" />
                    <JiraStatus item={lane.epic} />
                  </div>
                  <span className="text-sm leading-snug font-semibold">{lane.epic.title ?? lane.epic.key}</span>
                  {lane.epic.delivers !== null && (
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground" title={deliverableLabel(lane.epic.delivers)}>
                      <RouteIcon className="size-3 shrink-0" />
                      <span className="truncate">
                        {lane.epic.delivers.id} · {lane.epic.delivers.title}
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
          <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
            <defs>
              <marker id="jira-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0 0 L8 4 L0 8 Z" className="fill-muted-foreground" />
              </marker>
            </defs>
            {edges.map((d) => (
              <path key={d} d={d} fill="none" className="stroke-muted-foreground" strokeWidth={1.5} markerEnd="url(#jira-arrow)" />
            ))}
          </svg>
          {[...placed.values()].map(({ item, x, y }) => (
            <button
              key={item.key}
              type="button"
              data-card
              className={cn(
                "absolute flex flex-col gap-1 rounded-lg border bg-card px-3 py-2 text-left hover:border-foreground",
                selected === item.key && "border-2 border-foreground"
              )}
              style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
              onClick={() => setSelected(selected === item.key ? null : item.key)}
            >
              <span className="flex items-center gap-1.5 text-xs">
                <SquareCheckIcon className="size-3 text-muted-foreground" />
                <span className="font-mono font-semibold text-muted-foreground">{item.key}</span>
                <span className="ml-auto" />
                <JiraStatus item={item} />
              </span>
              <span className="line-clamp-2 text-[13px] leading-snug">{item.title ?? item.key}</span>
            </button>
          ))}
          {open !== undefined && <Popover placed={open} items={items} onClose={() => setSelected(null)} />}
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg border bg-background p-0.5" onPointerDown={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoom(1 / 1.2, ...centre())}>
            <MinusIcon />
          </Button>
          <span className="w-11 text-center text-xs">{Math.round(view.scale * 100)}%</span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoom(1.2, ...centre())}>
            <PlusIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={fit}>
            Fit
          </Button>
        </div>
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>One lane per epic</span>
        <span>Arrows are Jira&apos;s blocks links</span>
        <span>Drag to pan, Ctrl or ⌘ and scroll to zoom, click an item for its details</span>
      </p>
    </div>
  );
}
