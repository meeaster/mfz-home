import { ArrowUpDownIcon, BookOpenIcon, RadarIcon, TerminalIcon } from "lucide-react";
import { Fragment, useContext, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EffortTitles } from "@/components/effort-badges";
import { Markdown } from "@/components/markdown";
import { EmptyList, Loaded, PageBody, PageHeader } from "@/components/page";
import { api, useResource, type ArticlePage, type OriginAccess, type OriginItem, type ReferenceItem } from "@/lib/api";
import { daysAgo, plural, shortDate } from "@/lib/format";
import { effortHref, fileHref, routeHref, type Route } from "@/lib/route";

function AccessList({ access }: { readonly access: readonly OriginAccess[] }) {
  return (
    <span className="flex flex-col gap-1">
      {access.map((entry) => (
        <span key={`${entry.method} ${entry.detail}`} className="flex items-center gap-1.5">
          <TerminalIcon className="size-3 shrink-0 text-muted-foreground" />
          <span>{entry.method}</span>
          {entry.detail !== "" && <span className="font-mono text-xs text-muted-foreground">{entry.detail}</span>}
        </span>
      ))}
    </span>
  );
}

function GroupRow({ span, children }: { readonly span: number; readonly children: ReactNode }) {
  return (
    <TableRow className="bg-muted/60 hover:bg-muted/60">
      <TableCell colSpan={span} className="py-2">
        <span className="flex items-center gap-2 text-xs">{children}</span>
      </TableCell>
    </TableRow>
  );
}

type Grouping = "origin" | "section";

type ReferenceGroup = {
  readonly key: string;
  readonly origin: OriginItem | null;
  readonly section: string | null;
  readonly references: readonly ReferenceItem[];
};

// References under each origin, in the order the oldest observation first appears, or under each section they support.
function groupReferences(page: ArticlePage, grouping: Grouping): ReferenceGroup[] {
  const groups = new Map<string, ReferenceItem[]>();

  for (const reference of page.references) {
    const keys = grouping === "origin" ? [reference.origin] : reference.sections.length === 0 ? [""] : reference.sections;

    for (const key of keys) {
      groups.set(key, [...(groups.get(key) ?? []), reference]);
    }
  }

  // Sections follow the article's own heading order; any it no longer has, and the whole article, come last.
  const headings = [...(page.file.content ?? "").matchAll(/^#{1,6}[ \t]+(.+?)[ \t#]*$/gm)].map((match) => match[1] ?? "");
  const position = (key: string) => (grouping === "origin" ? 0 : headings.includes(key) ? headings.indexOf(key) : headings.length + (key === "" ? 1 : 0));
  const ordered = [...groups.entries()].sort(([left], [right]) => position(left) - position(right));

  return ordered.map(([key, references]) => ({
    key,
    origin: grouping === "origin" ? (page.origins.find((origin) => origin.key === key) ?? null) : null,
    section: grouping === "section" ? key : null,
    references
  }));
}

function ReferenceRow({ reference, grouping }: { readonly reference: ReferenceItem; readonly grouping: Grouping }) {
  return (
    <TableRow>
      <TableCell className="whitespace-normal pl-8">
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{reference.title}</span>
          <span className="font-mono text-xs break-all text-muted-foreground">{reference.locator}</span>
        </span>
      </TableCell>
      <TableCell className="align-top whitespace-normal">
        {grouping === "origin" ? (
          reference.sections.length === 0 ? (
            <span className="text-muted-foreground">Whole article</span>
          ) : (
            reference.sections.map((section) => (
              <span key={section} className="block">
                <span className="text-muted-foreground">§ </span>
                {section}
              </span>
            ))
          )
        ) : (
          <span className="font-mono text-xs text-muted-foreground">{reference.origin}</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <span className="flex flex-col gap-0.5">
          <span>
            {shortDate(reference.observed_at)}
            <span className="text-muted-foreground"> · {daysAgo(reference.observed_at)}</span>
          </span>
          {reference.version !== null && <span className="font-mono text-xs text-muted-foreground">{reference.version}</span>}
        </span>
      </TableCell>
    </TableRow>
  );
}

function References({ page }: { readonly page: ArticlePage }) {
  const [grouping, setGrouping] = useState<Grouping>("origin");

  if (page.references.length === 0) {
    return (
      <EmptyList
        title="No references"
        description="An agent records a reference for each place in an origin it looked at to write this article, so the article can be checked again."
      />
    );
  }

  const oldest = page.references[0]?.observed_at;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-6 text-sm text-muted-foreground">
        <span>
          <span className="text-xl font-semibold text-foreground">{page.references.length}</span> {page.references.length === 1 ? "reference" : "references"}
        </span>
        <span>
          <span className="text-xl font-semibold text-foreground">{page.origins.length}</span> {page.origins.length === 1 ? "origin" : "origins"}
        </span>
        {oldest !== undefined && (
          <span>
            <span className="text-xl font-semibold text-foreground">{shortDate(oldest)}</span> oldest observation
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowUpDownIcon className="size-3.5" />
          Oldest observed first
        </span>
        <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          Group by
          <ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={grouping} onValueChange={(next) => setGrouping(next === "section" ? "section" : "origin")}>
            <ToggleGroupItem value="origin">Origin</ToggleGroupItem>
            <ToggleGroupItem value="section">Section</ToggleGroupItem>
          </ToggleGroup>
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Looked at</TableHead>
              <TableHead className="w-56">{grouping === "origin" ? "Supports section" : "Origin"}</TableHead>
              <TableHead className="w-48">Observed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupReferences(page, grouping).map((group) => (
              <Fragment key={group.key}>
                <GroupRow span={3}>
                  {group.origin !== null ? (
                    <>
                      <RadarIcon className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold">{group.origin.title}</span>
                      <span className="font-mono text-muted-foreground">{group.origin.key}</span>
                      <span className="ml-auto flex items-center gap-3">
                        {group.origin.access.map((entry) => (
                          <span key={`${entry.method} ${entry.detail}`} className="flex items-center gap-1.5">
                            <TerminalIcon className="size-3 text-muted-foreground" />
                            {entry.method}
                            {entry.detail !== "" && <span className="font-mono text-muted-foreground">{entry.detail}</span>}
                          </span>
                        ))}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold">{group.section === "" ? "Whole article" : `§ ${group.section ?? ""}`}</span>
                  )}
                </GroupRow>
                {group.references.map((reference) => (
                  <ReferenceRow key={`${group.key} ${reference.origin} ${reference.locator}`} reference={reference} grouping={grouping} />
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ArticleContent({ page, route }: { readonly page: ArticlePage; readonly route: Route }) {
  if (page.file.content === null) {
    const reason = page.file.omitted === "missing" ? "The file is no longer on disk." : "The file can't be shown here.";

    return <EmptyList title="No content to show" description={reason} />;
  }

  const open = (path: string) => {
    window.location.hash = fileHref(route, path);
  };

  return (
    <div className="max-w-4xl">
      <Markdown content={page.file.content} folder={page.file.path.slice(0, page.file.path.lastIndexOf("/"))} onOpen={open} />
    </div>
  );
}

function ArticleEfforts({ slugs }: { readonly slugs: readonly string[] }) {
  const titles = useContext(EffortTitles);

  if (slugs.length === 0) {
    return <EmptyList title="In no effort" description="An article joins the efforts whose work relies on it or adds to it." />;
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {slugs.map((slug) => (
        <li key={slug}>
          <a href={effortHref(slug)} className="font-medium hover:underline">
            {titles.get(slug) ?? slug}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ArticleView({ path, route }: { readonly path: string; readonly route: Route }) {
  const page = useResource(`article:${path}`, (signal) => api.article(path, signal));

  return (
    <Loaded resource={page}>
      {(value) => {
        const title = value.article.title ?? value.article.display_path;

        return (
          <Tabs defaultValue="article" className="gap-0">
            <PageHeader
              crumbs={[{ label: "Knowledge", href: routeHref({ view: "knowledge" }) }, { label: title }]}
              title={title}
              description={value.article.description}
              meta={
                <>
                  <BookOpenIcon className="size-3.5" />
                  <span className="font-mono text-xs">{value.article.display_path}</span>
                  <span>· updated {shortDate(value.article.updated_at)}</span>
                  <span>· informed by {plural(value.article.informed_by, "file")}</span>
                </>
              }
            >
              <TabsList className="mt-1">
                <TabsTrigger value="article">Article</TabsTrigger>
                <TabsTrigger value="references">References {value.references.length}</TabsTrigger>
                <TabsTrigger value="efforts">Efforts {value.article.efforts.length}</TabsTrigger>
              </TabsList>
            </PageHeader>
            <PageBody>
              <TabsContent value="article">
                <ArticleContent page={value} route={route} />
              </TabsContent>
              <TabsContent value="references">
                <References page={value} />
              </TabsContent>
              <TabsContent value="efforts">
                <ArticleEfforts slugs={value.article.efforts} />
              </TabsContent>
            </PageBody>
          </Tabs>
        );
      }}
    </Loaded>
  );
}

export function OriginsView() {
  const page = useResource("origins", (signal) => api.origins(signal));
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <>
      <PageHeader
        title="Origins"
        badges={page.state === "ready" ? <span className="text-sm text-muted-foreground">{plural(page.value.origins.length, "origin")}</span> : null}
        description="The systems knowledge comes from, each described once with how to reach it. Knowledge articles reference what they looked at inside each one."
      />
      <PageBody>
        <Loaded resource={page}>
          {(value) => {
            const needle = search.trim().toLowerCase();

            const shown = value.origins.filter(
              (origin) =>
                (kind === "all" || origin.kind === kind) &&
                (needle === "" || [origin.key, origin.title, origin.description].some((text) => text.toLowerCase().includes(needle)))
            );

            return (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Input className="w-72" placeholder="Search origins, accounts, URLs" value={search} onChange={(event) => setSearch(event.target.value)} />
                  <ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={kind} onValueChange={(next) => setKind(next === "" ? "all" : next)}>
                    <ToggleGroupItem value="all">All</ToggleGroupItem>
                    {value.kinds.map((entry) => (
                      <ToggleGroupItem key={entry.name} value={entry.name}>
                        {entry.name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                {shown.length === 0 ? (
                  <EmptyList
                    title="No origins"
                    description="An agent registers an origin the first time a knowledge article rests on it: an AWS account, a Datadog org, a repository, a documentation site."
                  />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Origin</TableHead>
                          <TableHead className="w-96">Access</TableHead>
                          <TableHead className="w-36">Used by</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {value.kinds
                          .filter((entry) => shown.some((origin) => origin.kind === entry.name))
                          .map((entry) => (
                            <Fragment key={entry.name}>
                              <GroupRow span={3}>
                                <RadarIcon className="size-3.5 text-muted-foreground" />
                                <span className="font-semibold">{entry.name}</span>
                                <span className="text-muted-foreground">{entry.identifier}</span>
                              </GroupRow>
                              {shown
                                .filter((origin) => origin.kind === entry.name)
                                .map((origin) => (
                                  <TableRow key={origin.key}>
                                    <TableCell className="whitespace-normal">
                                      <span className="flex flex-col gap-0.5">
                                        <span className="flex flex-wrap items-baseline gap-2">
                                          <span className="font-medium">{origin.title}</span>
                                          <span className="font-mono text-xs break-all text-muted-foreground">{origin.identifier}</span>
                                        </span>
                                        {origin.description !== "" && <span className="text-xs text-muted-foreground">{origin.description}</span>}
                                      </span>
                                    </TableCell>
                                    <TableCell className="align-top whitespace-normal">
                                      {origin.access.length === 0 ? <span className="text-muted-foreground">—</span> : <AccessList access={origin.access} />}
                                    </TableCell>
                                    <TableCell className="align-top">
                                      <span className="flex flex-col gap-0.5">
                                        <span>{plural(origin.articles, "article")}</span>
                                        <span className="text-xs text-muted-foreground">{plural(origin.references, "reference")}</span>
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </Fragment>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            );
          }}
        </Loaded>
      </PageBody>
    </>
  );
}
