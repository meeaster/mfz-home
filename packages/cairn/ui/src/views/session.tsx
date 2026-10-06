import { CornerDownRightIcon, FolderOpenIcon, MessageSquareTextIcon, MessagesSquareIcon } from "lucide-react";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArtifactIcon, ArtifactSummary } from "@/components/artifact-row";
import { useEffortTitle } from "@/components/effort-badges";
import { Markdown } from "@/components/markdown";
import { EmptyList, Loaded, PageBody, PageHeader } from "@/components/page";
import { CostText, harnessName, SessionTable } from "@/components/session-table";
import { api, openFolder, useResource, type ArtifactItem, type SessionPage } from "@/lib/api";
import { categoryDot, dateTime, money, shortDate } from "@/lib/format";
import { effortHref, fileHref, routeHref, sessionHref, type Route } from "@/lib/route";

function FileRows({ files, route }: { readonly files: readonly ArtifactItem[]; readonly route: Route }) {
  return files.map((item) => (
    <TableRow key={item.path}>
      <TableCell className="align-top">
        <ArtifactIcon item={item} />
      </TableCell>
      <TableCell className="align-top whitespace-normal">
        <ArtifactSummary item={item} route={route} />
      </TableCell>
      <TableCell className="align-top">
        {item.category === null ? (
          <span className="text-muted-foreground">no category</span>
        ) : (
          <span className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", categoryDot(item.category))} />
            {item.category}
          </span>
        )}
      </TableCell>
      <TableCell className="align-top text-muted-foreground">{shortDate(item.captured_at)}</TableCell>
    </TableRow>
  ));
}

function Files({ session, route }: { readonly session: SessionPage; readonly route: Route }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Session and files</TableHead>
            <TableHead className="w-36">Category</TableHead>
            <TableHead className="w-24">Captured</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {session.tree.map((node) => (
            <Fragment key={node.session.key}>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={4} className="py-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm" style={{ paddingLeft: `${Math.max(0, node.depth - 1) * 16}px` }}>
                    {node.depth === 0 ? (
                      <MessagesSquareIcon className="size-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <CornerDownRightIcon className="size-4 text-muted-foreground" aria-hidden />
                    )}
                    <a href={sessionHref(node.session.key)} className="font-semibold hover:underline">
                      {node.session.title ?? "Untitled"}
                    </a>
                    {node.session.agent !== null && <Badge variant="outline">{node.session.agent}</Badge>}
                    <span className="font-mono text-xs text-muted-foreground">{node.session.key.slice(node.session.key.indexOf(":") + 1, node.session.key.indexOf(":") + 13)}</span>
                    {node.depth === 0 && <span className="text-xs text-muted-foreground">this session</span>}
                    {node.session.cost !== null && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        <CostText cost={node.session.cost} part="own" />
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              <FileRows files={node.files} route={route} />
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Conversation({ path, route }: { readonly path: string; readonly route: Route }) {
  const file = useResource(`conversation:${path}`, (signal) => api.file(path, signal));

  return (
    <Loaded resource={file}>
      {(value) =>
        value.content === null ? (
          <EmptyList title="No conversation to show" description="The export is missing or too large to show here." />
        ) : (
          <Card>
            <CardContent>
              <Markdown content={value.content} folder={path.slice(0, path.lastIndexOf("/"))} onOpen={(target) => {
                  window.location.hash = fileHref(route, target);
                }}
              />
            </CardContent>
          </Card>
        )
      }
    </Loaded>
  );
}

function CostCard({ cost }: { readonly cost: NonNullable<SessionPage["cost"]> }) {
  const rows: readonly (readonly [string, number])[] = [
    ["This session", cost.own],
    ["Subagents", cost.subagents],
    ["CLI runs", cost.cli_runs]
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Cost</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right tabular-nums">{money(value)}</dd>
            </div>
          ))}
          <dt className="border-t pt-2 font-medium">Total</dt>
          <dd className="border-t pt-2 text-right font-medium tabular-nums">{money(cost.total)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          At models.dev API rates.
          {cost.unpriced_calls > 0 && ` Leaves out ${cost.unpriced_calls} calls to models without a models.dev price.`}
        </p>
      </CardContent>
    </Card>
  );
}

function Details({ session, route }: { readonly session: SessionPage; readonly route: Route }) {
  const effortTitle = useEffortTitle();

  const rows: readonly (readonly [string, string, boolean])[] = [
    ["Harness", harnessName(session.harness), false],
    ["Agent", session.agent ?? "—", false],
    ["Directory", session.cwd ?? "—", true],
    ["Folder", session.folder, true],
    ["Started", dateTime(session.started_at), false],
    ["Last activity", dateTime(session.last_activity_at), false],
    ["Parent", session.parent ?? "none (root)", session.parent !== null],
    ["Workstream", session.workstream ?? "—", false],
    ["Subject", session.subject ?? "—", false]
  ];

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Session</CardTitle>
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
      {session.cost !== null && <CostCard cost={session.cost} />}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Attached efforts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {session.attachments.length === 0 && <p className="text-sm text-muted-foreground">Not attached to an effort.</p>}
          {session.attachments.map((attachment) => (
            <div key={attachment.slug} className="flex flex-col">
              <a href={effortHref(attachment.slug)} className="text-sm font-medium hover:underline">
                {attachment.title}
              </a>
              <span className="text-xs text-muted-foreground">
                Attached by {attachment.attached_by}, {shortDate(attachment.attached_at)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Read by this session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {session.reads.length === 0 && <p className="text-sm text-muted-foreground">No recorded reads.</p>}
          {session.reads.map((item) => (
            <a key={item.path} href={item.location === "url" ? item.path : fileHref(route, item.path)} className="flex flex-col hover:underline">
              <span className="font-mono text-xs break-all">{item.display_path}</span>
              <span className="text-xs text-muted-foreground">{item.title ?? item.efforts.map(effortTitle).join(", ")}</span>
            </a>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

export function SessionView({ sessionKey, route }: { readonly sessionKey: string; readonly route: Route }) {
  const session = useResource(`session:${sessionKey}`, (signal) => api.session(sessionKey, signal));
  const effortTitle = useEffortTitle();

  return (
    <Loaded resource={session}>
      {(value) => {
        const fileCount = value.tree.reduce((sum, node) => sum + node.files.length, 0);

        return (
          <Tabs defaultValue="files" className="gap-0">
            <PageHeader
              crumbs={[{ label: "Sessions", href: routeHref({ view: "sessions" }) }, { label: value.title ?? "Untitled" }]}
              title={value.title ?? "Untitled session"}
              badges={
                <>
                  <Badge variant="secondary">{harnessName(value.harness)}</Badge>
                  <Badge variant="outline">{value.parent === null ? "root session" : "child session"}</Badge>
                  {value.origin === "cli" && <Badge variant="outline">CLI run</Badge>}
                </>
              }
              actions={
                <>
                  {value.conversation !== null && (
                    <Button variant="outline" asChild>
                      <a href={fileHref(route, value.conversation)}>
                        <MessageSquareTextIcon data-icon="inline-start" />
                        Open conversation
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => void openFolder(value.folder)}>
                    <FolderOpenIcon data-icon="inline-start" />
                    Open folder
                  </Button>
                </>
              }
              description={value.description}
              meta={
                <>
                  <span className="font-mono text-xs">{value.key}</span>
                  {value.spawned_by !== null && <span aria-hidden>·</span>}
                  {value.spawned_by !== null && (
                    <span>
                      Run from{" "}
                      <a href={sessionHref(value.spawned_by.key)} className="hover:underline">
                        {value.spawned_by.title ?? value.spawned_by.key}
                      </a>
                    </span>
                  )}
                  {value.efforts.length > 0 && <span aria-hidden>·</span>}
                  {value.efforts.length > 0 && <span>Attached to</span>}
                  {value.efforts.map((slug) => (
                    <Badge key={slug} variant="outline" asChild>
                      <a href={effortHref(slug)}>{effortTitle(slug)}</a>
                    </Badge>
                  ))}
                </>
              }
            >
              <TabsList className="mt-1">
                <TabsTrigger value="files">Files {fileCount}</TabsTrigger>
                <TabsTrigger value="reads">Reads {value.reads.length}</TabsTrigger>
                {value.spawned.length > 0 && <TabsTrigger value="spawned">CLI runs {value.spawned.length}</TabsTrigger>}
                <TabsTrigger value="conversation" disabled={value.conversation === null}>
                  Conversation
                </TabsTrigger>
              </TabsList>
            </PageHeader>
            <PageBody>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <TabsContent value="files">
                    <Files session={value} route={route} />
                  </TabsContent>
                  <TabsContent value="reads">
                    {value.reads.length === 0 ? (
                      <EmptyList title="No recorded reads" description="Files this session read under the root appear here." />
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableBody>
                            <FileRows files={value.reads} route={route} />
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="spawned">
                    <SessionTable sessions={value.spawned} />
                  </TabsContent>
                  <TabsContent value="conversation">{value.conversation !== null && <Conversation path={value.conversation} route={route} />}</TabsContent>
                </div>
                <Details session={value} route={route} />
              </div>
            </PageBody>
          </Tabs>
        );
      }}
    </Loaded>
  );
}
