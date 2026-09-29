import {
  BookOpenIcon,
  DraftingCompassIcon,
  FileIcon,
  FilePenLineIcon,
  FileTextIcon,
  GitPullRequestIcon,
  GlobeIcon,
  MessageSquareTextIcon,
  SquareCheckIcon,
  type LucideIcon
} from "lucide-react";
import type { ArtifactItem } from "./api.ts";

// A plain YYYY-MM-DD is a calendar day, so it's read as local time rather than UTC midnight.
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function shortDate(value: string): string {
  return toDate(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function dateTime(value: string): string {
  return toDate(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function time(value: string): string {
  return toDate(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// The heading a list groups rows under: "Today · Oct 11", or the date.
export function dayLabel(value: string, now = new Date()): string {
  const date = toDate(value);

  return dayKey(date) === dayKey(now) ? `Today · ${shortDate(value)}` : shortDate(value);
}

export function groupByDay<Row>(rows: readonly Row[], dateOf: (row: Row) => string): { day: string; rows: Row[] }[] {
  const groups: { day: string; rows: Row[] }[] = [];

  for (const row of rows) {
    const day = dayLabel(dateOf(row));
    const last = groups.at(-1);

    if (last?.day === day) {
      last.rows.push(row);
    } else {
      groups.push({ day, rows: [row] });
    }
  }

  return groups;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function tokens(count: number): string {
  return count >= 1000 ? `~${(count / 1000).toFixed(1)}k tokens` : `~${count} tokens`;
}

// Tailwind only generates classes it can see written out, so each category's colour is listed in full.
const categoryDots = new Map<string, string>([
  ["record", "bg-cat-record"],
  ["deliverable", "bg-cat-deliverable"],
  ["knowledge", "bg-cat-knowledge"],
  ["synthesis", "bg-cat-synthesis"],
  ["evidence", "bg-cat-evidence"],
  ["learning", "bg-cat-learning"],
  ["source", "bg-cat-source"],
  ["conversation", "bg-cat-conversation"],
  ["pull_request", "bg-cat-deliverable"],
  ["jira_issue", "bg-cat-deliverable"],
  ["issue", "bg-cat-deliverable"],
  ["confluence_page", "bg-cat-deliverable"]
]);

export function categoryDot(group: string): string {
  return categoryDots.get(group) ?? "bg-cat-other";
}

const groupLabels = new Map<string, string>([
  ["pull_request", "pull requests"],
  ["jira_issue", "Jira items"],
  ["issue", "issues"],
  ["confluence_page", "Confluence pages"]
]);

export function groupLabel(group: string): string {
  return groupLabels.get(group) ?? group;
}

export function artifactIcon(item: ArtifactItem): LucideIcon {
  if (item.pointer_type === "pull_request") {
    return GitPullRequestIcon;
  }

  if (item.pointer_type === "jira_issue" || item.pointer_type === "issue") {
    return SquareCheckIcon;
  }

  if (item.location === "url") {
    return item.pointer_type === "confluence_page" ? FileTextIcon : GlobeIcon;
  }

  if (item.category === "knowledge") {
    return BookOpenIcon;
  }

  if (item.display_path.startsWith("designs/")) {
    return DraftingCompassIcon;
  }

  if (item.category === "record") {
    return FilePenLineIcon;
  }

  if (item.category === "conversation") {
    return MessageSquareTextIcon;
  }

  return FileIcon;
}

export function artifactTitle(item: ArtifactItem): string {
  return item.title ?? item.display_path.split("/").at(-1) ?? item.display_path;
}

// Files under the subject folders are found by where they live, so their path is worth showing.
export function showsPath(item: ArtifactItem): boolean {
  return /^(designs|knowledge|sources)\//.test(item.display_path);
}
