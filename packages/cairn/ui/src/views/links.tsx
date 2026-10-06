import { ArrowUpRightIcon, ChevronDownIcon, ChevronRightIcon, FileTextIcon, LayersIcon, RefreshCwIcon, SquareCheckIcon, ZapIcon } from "lucide-react";
import { Fragment, useContext, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EffortTitles } from "@/components/effort-badges";
import { deliverableLabel, JiraStatus } from "@/components/jira-canvas";
import { EmptyList, Loaded, PageBody, PageHeader } from "@/components/page";
import { api, useResource, type JiraItem, type LinkRole, type PageLink } from "@/lib/api";
import { dateTime } from "@/lib/format";

type Filter = "all" | "created" | "referenced";

const roleLabel: Readonly<Record<NonNullable<LinkRole>, string>> = { created: "Created", referenced: "Referenced" };

function RoleBadge({ role }: { readonly role: LinkRole }) {
  return role === null ? null : <Badge variant={role === "created" ? "default" : "outline"}>{roleLabel[role]}</Badge>;
}

function matches(filter: Filter, search: string, role: LinkRole, ...text: readonly (string | null)[]): boolean {
  const needle = search.trim().toLowerCase();

  return (filter === "all" || role === filter) && (needle === "" || text.some((value) => value?.toLowerCase().includes(needle)));
}

// Items under each effort they belong to, efforts in title order, then any in none.
function byEffort<Item extends { readonly efforts: readonly string[] }>(items: readonly Item[], titles: ReadonlyMap<string, string>): [string, Item[]][] {
  const groups = new Map<string, Item[]>();

  for (const item of items) {
    for (const slug of item.efforts.length === 0 ? [""] : item.efforts) {
      groups.set(slug, [...(groups.get(slug) ?? []), item]);
    }
  }

  const title = (slug: string) => (slug === "" ? "In no effort" : (titles.get(slug) ?? slug));

  return [...groups.entries()].sort(([left], [right]) => (left === "" ? 1 : right === "" ? -1 : title(left).localeCompare(title(right)))).map(([slug, members]) => [title(slug), members]);
}

function GroupRow({ title, count, span }: { readonly title: string; readonly count: string; readonly span: number }) {
  return (
    <TableRow className="bg-muted/60 hover:bg-muted/60">
      <TableCell colSpan={span} className="py-2">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <LayersIcon className="size-3.5 text-muted-foreground" />
          {title}
          <span className="font-normal text-muted-foreground">{count}</span>
        </span>
      </TableCell>
    </TableRow>
  );
}

function Confluence({ pages, filter, search }: { readonly pages: readonly PageLink[]; readonly filter: Filter; readonly search: string }) {
  const titles = useContext(EffortTitles);
  const shown = pages.filter((page) => matches(filter, search, page.role, page.title, page.description, page.space));

  if (shown.length === 0) {
    return <EmptyList title="No Confluence pages" description="Pages an agent registers for an effort show up here, as created or referenced." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Page</TableHead>
            <TableHead className="w-32">Role</TableHead>
            <TableHead className="w-28">Space</TableHead>
            <TableHead className="w-28">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {byEffort(shown, titles).map(([title, members]) => (
            <Fragment key={title}>
              <GroupRow title={title} count={String(members.length)} span={4} />
              {members.map((page) => (
                <TableRow key={`${title}-${page.url}`}>
                  <TableCell className="whitespace-normal">
                    <span className="flex gap-2.5">
                      <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="flex flex-col gap-0.5">
                        <a href={page.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium hover:underline">
                          {page.title ?? page.url}
                          <ArrowUpRightIcon className="size-3 text-muted-foreground" />
                        </a>
                        {page.description !== null && <span className="text-xs text-muted-foreground">{page.description}</span>}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <RoleBadge role={page.role} />
                  </TableCell>
                  <TableCell className="align-top font-mono text-xs text-muted-foreground">{page.space ?? ""}</TableCell>
                  <TableCell className="align-top text-muted-foreground">{page.updated ?? ""}</TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function JiraRow({ item, depth, toggle }: { readonly item: JiraItem; readonly depth: number; readonly toggle: ReactNode }) {
  const epic = item.type?.toLowerCase() === "epic";

  return (
    <TableRow>
      <TableCell className="whitespace-normal" style={{ paddingLeft: 12 + depth * 28 }}>
        <span className="flex items-center gap-2">
          {toggle}
          {epic ? <ZapIcon className="size-3.5 text-cat-synthesis" /> : <SquareCheckIcon className="size-3.5 text-muted-foreground" />}
          <a href={item.url} target="_blank" rel="noreferrer" className={`font-mono text-xs font-semibold hover:underline ${epic ? "text-cat-synthesis" : "text-muted-foreground"}`}>
            {item.key}
          </a>
          <span className={epic ? "font-semibold" : ""}>{item.title ?? ""}</span>
        </span>
        {epic && item.delivers !== null && <span className="ml-12 block text-xs text-muted-foreground">Delivers {deliverableLabel(item.delivers)}</span>}
      </TableCell>
      <TableCell className="align-top">
        <RoleBadge role={item.role} />
      </TableCell>
      <TableCell className="align-top">
        <JiraStatus item={item} />
      </TableCell>
      <TableCell className="align-top text-muted-foreground">{item.read_at === null ? "" : dateTime(item.read_at)}</TableCell>
    </TableRow>
  );
}

function Jira({ items, filter, search }: { readonly items: readonly JiraItem[]; readonly filter: Filter; readonly search: string }) {
  const titles = useContext(EffortTitles);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const shown = items.filter((item) => matches(filter, search, item.role, item.key, item.title, item.description));

  if (shown.length === 0) {
    return <EmptyList title="No Jira items" description="Jira items an agent registers for an effort show up here, epics with their stories." />;
  }

  const flip = (key: string) => setOpen((current) => (current.has(key) ? new Set([...current].filter((other) => other !== key)) : new Set([...current, key])));

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="w-32">Role</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-40">Read</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {byEffort(shown, titles).map(([title, members]) => {
            const epics = members.filter((item) => item.type?.toLowerCase() === "epic");
            const epicKeys = new Set(epics.map((epic) => epic.key));
            const loose = members.filter((item) => !epicKeys.has(item.key) && (item.parent === null || !epicKeys.has(item.parent)));

            return (
              <Fragment key={title}>
                <GroupRow title={title} count={`${epics.length} ${epics.length === 1 ? "epic" : "epics"} · ${members.length - epics.length} other`} span={4} />
                {epics.map((epic) => {
                  const children = members.filter((item) => item.parent === epic.key);
                  const expanded = open.has(`${title}-${epic.key}`);

                  const toggle = (
                    <button type="button" aria-label={expanded ? "Collapse" : "Expand"} className="text-muted-foreground" onClick={() => flip(`${title}-${epic.key}`)} disabled={children.length === 0}>
                      {expanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
                    </button>
                  );

                  return (
                    <Fragment key={epic.key}>
                      <JiraRow item={epic} depth={0} toggle={toggle} />
                      {expanded && children.map((child) => <JiraRow key={child.key} item={child} depth={1} toggle={null} />)}
                    </Fragment>
                  );
                })}
                {loose.map((item) => (
                  <JiraRow key={item.key} item={item} depth={0} toggle={<span className="w-4" />} />
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function LinksView() {
  const links = useResource("links", (signal) => api.links(signal));
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  return (
    <Loaded resource={links}>
      {(value) => {
        const reads = value.jira.map((item) => item.read_at).filter((read) => read !== null).sort();
        const lastRead = reads.at(-1);

        return (
          <Tabs defaultValue="confluence" className="gap-0">
            <PageHeader title="Jira and Confluence" description="Every Jira item and Confluence page your efforts have registered: the ones you created, and other people's that the work relies on.">
              <TabsList className="mt-1">
                <TabsTrigger value="confluence">Confluence {value.confluence.length}</TabsTrigger>
                <TabsTrigger value="jira">Jira {value.jira.length}</TabsTrigger>
              </TabsList>
            </PageHeader>
            <PageBody>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Input className="w-72" placeholder="Search titles and keys" value={search} onChange={(event) => setSearch(event.target.value)} />
                <ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={filter} onValueChange={(next) => setFilter(next === "created" || next === "referenced" ? next : "all")}>
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="created">Created by me</ToggleGroupItem>
                  <ToggleGroupItem value="referenced">Referenced</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <TabsContent value="confluence">
                <Confluence pages={value.confluence} filter={filter} search={search} />
              </TabsContent>
              <TabsContent value="jira" className="flex flex-col gap-2">
                <Jira items={value.jira} filter={filter} search={search} />
                {lastRead !== undefined && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCwIcon className="size-3" />
                    Status as read from Jira {dateTime(lastRead)} by an agent.
                  </p>
                )}
              </TabsContent>
            </PageBody>
          </Tabs>
        );
      }}
    </Loaded>
  );
}
