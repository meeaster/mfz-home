// The work around an effort as the human tracks it: its Jira items and Confluence pages as agents last read them, the
// other pages it links, and the designs whose plans it delivers. Nothing here is stored for the plan: which deliverable
// a Jira item delivers comes from the design that links the item or its epic, read when the page is drawn.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { integer, optionalInteger, optionalText, text, type Cairn, type Row } from "../core/db.ts";
import type { DeliverableRef, DeliveredDesign, EffortWork, JiraItem, LinkRole, LinksPage, PageLink } from "./api.ts";
import { designPlan, type PlanDeliverable } from "./records.ts";

const blocksJson = z.array(z.string());

type Plan = { readonly slug: string; readonly title: string; readonly doc_url: string | null; readonly plan: readonly PlanDeliverable[] };

function roleOf(category: string | null): LinkRole {
  return category === "deliverable" ? "created" : category === "source" ? "referenced" : null;
}

function blocksOf(value: string | null): string[] {
  if (value === null) {
    return [];
  }

  const parsed = blocksJson.safeParse(JSON.parse(value));

  return parsed.success ? parsed.data : [];
}

function categoryOf(value: string | null): JiraItem["category"] {
  switch (value) {
    case "todo":
    case "progress":
    case "done":
      return value;
    default:
      return null;
  }
}

// The efforts each URL artifact belongs to.
function effortsByArtifact(cairn: Cairn): Map<number, string[]> {
  const found = new Map<number, string[]>();

  for (const row of cairn.sql.all`
    SELECT artifact_effort.artifact_id, effort.slug FROM artifact_effort
    JOIN effort ON effort.id = artifact_effort.effort_id
    JOIN artifact ON artifact.id = artifact_effort.artifact_id
    WHERE artifact.location = 'url'
    ORDER BY effort.slug
  `) {
    const id = integer(row, "artifact_id");

    found.set(id, [...(found.get(id) ?? []), text(row, "slug")]);
  }

  return found;
}

// Every registered URL with what an agent last read about it, optionally only those in one effort.
function urlRows(cairn: Cairn, effortId: number | null): Row[] {
  return cairn.sql.all`
    SELECT artifact.id, artifact.path_or_url AS url, artifact.pointer_type, artifact.category, artifact.title, artifact.description,
      jira_item.issue_key, jira_item.issue_type, jira_item.status, jira_item.status_category, jira_item.parent_key,
      jira_item.blocks, jira_item.read_at AS jira_read, confluence_page.space, confluence_page.version,
      confluence_page.page_updated
    FROM artifact
    LEFT JOIN jira_item ON jira_item.artifact_id = artifact.id
    LEFT JOIN confluence_page ON confluence_page.artifact_id = artifact.id
    WHERE artifact.location = 'url' AND artifact.status != 'archived'
      AND (${effortId} IS NULL OR artifact.id IN (SELECT artifact_id FROM artifact_effort WHERE effort_id = ${effortId}))
    ORDER BY artifact.captured_at, artifact.id
  `;
}

// The plans of every design that has one, read from designs/<slug>/design.json.
function plans(cairn: Cairn, designs: readonly { readonly slug: string; readonly title: string; readonly doc_url: string | null }[]): Plan[] {
  const found: Plan[] = [];

  for (const design of designs) {
    let source: string;

    try {
      source = readFileSync(join(cairn.root, "designs", design.slug, "design.json"), "utf8");
    } catch {
      continue;
    }

    const { plan } = designPlan(source);

    if (plan.length > 0) {
      found.push({ ...design, plan });
    }
  }

  return found;
}

// The deliverable a Jira item delivers: the one whose plan links the item, or failing that the item's epic.
function deliverableOf(key: string, parent: string | null, designPlans: readonly Plan[]): DeliverableRef | null {
  for (const wanted of [key, parent]) {
    for (const design of designPlans) {
      const deliverable = design.plan.find((candidate) => wanted !== null && candidate.keys.includes(wanted));

      if (deliverable !== undefined) {
        return { design: design.slug, design_title: design.title, id: deliverable.id, title: deliverable.title };
      }
    }
  }

  return null;
}

function jiraItem(row: Row, efforts: readonly string[], designPlans: readonly Plan[]): JiraItem | null {
  const key = optionalText(row, "issue_key") ?? /\/browse\/([A-Z][A-Z0-9_]*-\d+)/.exec(text(row, "url"))?.[1];

  if (key === undefined) {
    return null;
  }

  const parent = optionalText(row, "parent_key");

  return {
    url: text(row, "url"),
    key,
    title: optionalText(row, "title"),
    description: optionalText(row, "description"),
    type: optionalText(row, "issue_type"),
    status: optionalText(row, "status"),
    category: categoryOf(optionalText(row, "status_category")),
    parent,
    blocks: blocksOf(optionalText(row, "blocks")),
    read_at: optionalText(row, "jira_read"),
    role: roleOf(optionalText(row, "category")),
    efforts,
    delivers: deliverableOf(key, parent, designPlans)
  };
}

function pageLink(row: Row, efforts: readonly string[]): PageLink {
  return {
    url: text(row, "url"),
    title: optionalText(row, "title"),
    description: optionalText(row, "description"),
    pointer_type: optionalText(row, "pointer_type"),
    role: roleOf(optionalText(row, "category")),
    space: optionalText(row, "space"),
    version: optionalInteger(row, "version"),
    updated: optionalText(row, "page_updated"),
    efforts
  };
}

type Registered = { readonly jira: JiraItem[]; readonly confluence: PageLink[]; readonly other: PageLink[] };

function split(cairn: Cairn, rows: readonly Row[], designPlans: readonly Plan[]): Registered {
  const efforts = effortsByArtifact(cairn);
  const jira: JiraItem[] = [];
  const confluence: PageLink[] = [];
  const other: PageLink[] = [];

  for (const row of rows) {
    const memberOf = efforts.get(integer(row, "id")) ?? [];
    const type = optionalText(row, "pointer_type");

    if (type === "jira_issue") {
      const item = jiraItem(row, memberOf, designPlans);

      if (item !== null) {
        jira.push(item);
      }
    } else if (type === "confluence_page") {
      confluence.push(pageLink(row, memberOf));
    } else {
      other.push(pageLink(row, memberOf));
    }
  }

  return { jira, confluence, other };
}

type DesignSummary = { readonly slug: string; readonly title: string; readonly doc_url: string | null; readonly efforts: readonly string[] };

// An effort's Jira items, Confluence pages and other links, and the designs it delivers: those whose plan links one of
// its Jira items or their epics, and those whose records belong to it.
export function effortWork(cairn: Cairn, effortId: number, slug: string, designs: readonly DesignSummary[]): EffortWork {
  const designPlans = plans(cairn, designs);
  const { jira, confluence, other } = split(cairn, urlRows(cairn, effortId), designPlans);
  const keys = new Set(jira.flatMap((item) => [item.key, ...(item.parent === null ? [] : [item.parent])]));
  const delivered: DeliveredDesign[] = [];

  for (const design of designs) {
    const plan = designPlans.find((candidate) => candidate.slug === design.slug)?.plan ?? [];
    const mine = plan.filter((deliverable) => deliverable.keys.some((key) => keys.has(key)));

    if (mine.length === 0 && !design.efforts.includes(slug)) {
      continue;
    }

    const status = (deliverable: PlanDeliverable): string => deliverable.status.toLowerCase();

    delivered.push({
      slug: design.slug,
      title: design.title,
      doc_url: design.doc_url,
      deliverables: mine.map((deliverable) => ({ id: deliverable.id, title: deliverable.title, status: deliverable.status })),
      plan: {
        total: plan.length,
        done: plan.filter((deliverable) => status(deliverable) === "done").length,
        in_progress: plan.filter((deliverable) => status(deliverable) === "in progress").length
      }
    });
  }

  return { designs: delivered, jira, confluence, other };
}

// Every registered Jira item and Confluence page, across efforts.
export function linksPage(cairn: Cairn, designs: readonly DesignSummary[]): LinksPage {
  const { jira, confluence } = split(cairn, urlRows(cairn, null), plans(cairn, designs));

  const efforts = cairn.sql.all`SELECT slug, title FROM effort WHERE status != 'archived' ORDER BY title`.map((row) => ({
    slug: text(row, "slug"),
    title: text(row, "title")
  }));

  return { efforts, jira, confluence };
}

// How many Jira items and Confluence pages are registered, for the sidebar.
export function linkCount(cairn: Cairn): number {
  const row = cairn.sql.get`
    SELECT count(*) AS count FROM artifact
    WHERE location = 'url' AND status != 'archived' AND pointer_type IN ('jira_issue', 'confluence_page')
  `;

  return row === undefined ? 0 : integer(row, "count");
}
