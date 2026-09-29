import { ChevronDownIcon, FilePenLineIcon, FolderOpenIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArtifactTable } from "@/components/artifact-table";
import { EmptyList, Loaded, PageBody, PageHeader } from "@/components/page";
import { SessionTable } from "@/components/session-table";
import { api, openFolder, useResource, type ArtifactGroupItem, type EffortPage, type EffortStatus } from "@/lib/api";
import { dateTime, groupLabel, tokens } from "@/lib/format";
import { effortHref, fileHref, routeHref, type Route } from "@/lib/route";

type Grouping = "category" | "session";

export const statusBadge: Readonly<Record<EffortStatus, "ok" | "warn" | "secondary">> = {
  active: "ok",
  provisional: "warn",
  paused: "secondary",
  done: "secondary",
  archived: "secondary"
};

const relationLabels: Readonly<Record<EffortPage["links"][number]["relation"], string>> = {
  depends_on: "depends on",
  needed_by: "needed by",
  split_from: "split from",
  split_into: "split into",
  related: "related to"
};

// The same artifacts regrouped by the session that produced them.
function bySession(groups: readonly ArtifactGroupItem[]): ArtifactGroupItem[] {
  const sessions = new Map<string, ArtifactGroupItem["artifacts"][number][]>();

  for (const group of groups) {
    for (const item of group.artifacts) {
      const key = item.producer?.title ?? item.producer?.session ?? "No session";
      const members = sessions.get(key) ?? [];

      members.push(item);
      sessions.set(key, members);
    }
  }

  return [...sessions.entries()].map(([group, artifacts]) => ({ group, artifacts }));
}

function Artifacts({ effort, route }: { readonly effort: EffortPage; readonly route: Route }) {
  const [filter, setFilter] = useState("all");
  const [grouping, setGrouping] = useState<Grouping>("category");
  const total = effort.groups.reduce((sum, group) => sum + group.artifacts.length, 0);
  const filtered = filter === "all" ? effort.groups : effort.groups.filter((group) => group.group === filter);
  const shown = grouping === "category" ? filtered : bySession(filtered);

  if (total === 0) {
    return <EmptyList title="No artifacts yet" description="Files and links from this effort's sessions show up here once they're captured." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={filter} onValueChange={(value) => setFilter(value === "" ? "all" : value)} className="flex-wrap">
          <ToggleGroupItem value="all">All {total}</ToggleGroupItem>
          {effort.groups.map((group) => (
            <ToggleGroupItem key={group.group} value={group.group}>
              {groupLabel(group.group)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-auto">
              <ChevronDownIcon data-icon="inline-start" />
              Group by {grouping}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup value={grouping} onValueChange={(value) => setGrouping(value === "session" ? "session" : "category")}>
                <DropdownMenuRadioItem value="category">Category</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="session">Session</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ArtifactTable groups={shown} route={route} colored={grouping === "category"} />
    </div>
  );
}

function Links({ effort }: { readonly effort: EffortPage }) {
  if (effort.links.length === 0) {
    return <EmptyList title="No linked efforts" description="Links record when one effort depends on, splits from, or relates to another." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {effort.links.map((link) => (
        <Card key={`${link.relation}-${link.slug}`} size="sm">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {relationLabels[link.relation]}
              </Badge>
              <a href={effortHref(link.slug)} className="hover:underline">
                {link.title}
              </a>
              <Badge variant={statusBadge[link.status]}>{link.status}</Badge>
            </CardTitle>
          </CardHeader>
          {link.summary !== null && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{link.summary}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function Details({ effort, route }: { readonly effort: EffortPage; readonly route: Route }) {
  const rows: readonly (readonly [string, string, boolean])[] = [
    ["Slug", effort.slug, true],
    ["Status", effort.status, false],
    ["Created", dateTime(effort.created_at), false],
    ["Last activity", dateTime(effort.last_activity_at), false],
    ["Folder", `efforts/${effort.slug}/`, true]
  ];

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
      {effort.summary !== null && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{effort.summary}</p>
          </CardContent>
        </Card>
      )}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Effort</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {rows.map(([label, value, mono]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={mono ? "font-mono text-xs leading-5 break-all" : ""}>{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {effort.records.length === 0 && <p className="text-sm text-muted-foreground">No effort.md or design.md yet.</p>}
          {effort.records.map((record) => (
            <a key={record.name} href={fileHref(route, record.path)} className="flex items-center gap-2 text-sm hover:underline">
              <FilePenLineIcon className="size-4 text-muted-foreground" aria-hidden />
              {record.name}
              <span className="ml-auto text-xs text-muted-foreground">{tokens(record.approx_tokens)}</span>
            </a>
          ))}
        </CardContent>
      </Card>
      {effort.links.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {effort.links.map((link) => (
              <div key={`${link.relation}-${link.slug}`} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono">
                  {link.relation}
                </Badge>
                <a href={effortHref(link.slug)} className="truncate hover:underline">
                  {link.title}
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </aside>
  );
}

export function EffortView({ slug, route }: { readonly slug: string; readonly route: Route }) {
  const effort = useResource(`effort:${slug}`, (signal) => api.effort(slug, signal));

  return (
    <Loaded resource={effort}>
      {(value) => {
        const initiative = value.tags.find((tag) => tag.startsWith("initiative:"));
        const artifactCount = value.groups.reduce((sum, group) => sum + group.artifacts.length, 0);

        return (
          <Tabs defaultValue="artifacts" className="gap-0">
            <PageHeader
              crumbs={[
                { label: "Efforts", href: routeHref({ view: "efforts" }) },
                ...(initiative === undefined ? [] : [{ label: initiative }]),
                { label: value.title }
              ]}
              title={value.title}
              badges={<Badge variant={statusBadge[value.status]}>{value.status}</Badge>}
              actions={
                <Button variant="outline" onClick={() => void openFolder(value.folder)}>
                  <FolderOpenIcon data-icon="inline-start" />
                  Open folder
                </Button>
              }
              description={value.description}
              meta={
                <>
                  <span className="font-mono text-xs">{value.slug}</span>
                  {value.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </>
              }
            >
              <TabsList className="mt-1">
                <TabsTrigger value="artifacts">Artifacts {artifactCount}</TabsTrigger>
                <TabsTrigger value="sessions">Sessions {value.sessions.length}</TabsTrigger>
                <TabsTrigger value="links">Links {value.links.length}</TabsTrigger>
              </TabsList>
            </PageHeader>
            <PageBody>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <TabsContent value="artifacts">
                    <Artifacts effort={value} route={route} />
                  </TabsContent>
                  <TabsContent value="sessions">
                    {value.sessions.length === 0 ? (
                      <EmptyList title="No sessions attached" description="Sessions attach to an effort when you approve it." />
                    ) : (
                      <SessionTable sessions={value.sessions} />
                    )}
                  </TabsContent>
                  <TabsContent value="links">
                    <Links effort={value} />
                  </TabsContent>
                </div>
                <Details effort={value} route={route} />
              </div>
            </PageBody>
          </Tabs>
        );
      }}
    </Loaded>
  );
}
