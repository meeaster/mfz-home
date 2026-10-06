import { BookOpenIcon, DraftingCompassIcon, ExternalLinkIcon, InboxIcon, LayersIcon, MailIcon, MessageCircleIcon, TicketIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EffortBadges } from "@/components/effort-badges";
import { EmptyList, Loaded, PageBody, PageHeader } from "@/components/page";
import { harnessName, SessionTable } from "@/components/session-table";
import { api, useResource, type DesignItem, type SourceItem } from "@/lib/api";
import { groupByDay, plural, shortDate } from "@/lib/format";
import { effortHref, fileHref, type Route } from "@/lib/route";
import { statusBadge } from "./effort";

type Option = { readonly value: string; readonly label: string };

function Filter({ options, value, onChange }: { readonly options: readonly Option[]; readonly value: string; readonly onChange: (value: string) => void }) {
  return (
    <ToggleGroup type="single" variant="outline" size="sm" spacing={1} value={value} onValueChange={(next) => next !== "" && onChange(next)}>
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// A title that opens a file in the viewer, with a description and the path under it.
function OpenableTitle({ icon: Icon, title, description, path, href }: { readonly icon: LucideIcon; readonly title: string; readonly description: string | null; readonly path: string; readonly href: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <a href={href} className="font-medium hover:underline">
          {title}
        </a>
        {description !== null && <p className="text-sm text-muted-foreground">{description}</p>}
        <p className="font-mono text-xs break-all text-muted-foreground">{path}</p>
      </div>
    </div>
  );
}

export function EffortsView() {
  const efforts = useResource("efforts", (signal) => api.efforts(signal));
  const [status, setStatus] = useState("open");

  return (
    <>
      <PageHeader title="Efforts" badges={efforts.state === "ready" ? <span className="text-sm text-muted-foreground">{plural(efforts.value.length, "effort")}</span> : null} />
      <PageBody>
        <Loaded resource={efforts}>
          {(list) => {
            const shown = list.filter((effort) => status === "all" || (status === "open" ? effort.status !== "done" : effort.status === status));

            return (
              <>
                <Filter
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "open", label: "Open" },
                    { value: "provisional", label: `Provisional ${list.filter((effort) => effort.status === "provisional").length}` },
                    { value: "done", label: "Done" },
                    { value: "all", label: "All" }
                  ]}
                />
                {shown.length === 0 ? (
                  <EmptyList title="No efforts here" description="Efforts are created when you approve one for a session." />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Effort</TableHead>
                          <TableHead className="w-28">Status</TableHead>
                          <TableHead className="w-20 text-right">Sessions</TableHead>
                          <TableHead className="w-20 text-right">Artifacts</TableHead>
                          <TableHead className="w-28 text-right">Last activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shown.map((effort) => (
                          <TableRow key={effort.slug}>
                            <TableCell className="whitespace-normal">
                              <div className="flex items-start gap-3">
                                <LayersIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                                <div className="flex min-w-0 flex-col gap-1">
                                  <a href={effortHref(effort.slug)} className="font-medium hover:underline">
                                    {effort.title}
                                  </a>
                                  {effort.description !== "" && <p className="text-sm text-muted-foreground">{effort.description}</p>}
                                  {effort.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {effort.tags.map((tag) => (
                                        <Badge key={tag} variant="outline">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge variant={statusBadge[effort.status]}>{effort.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right align-top">{effort.session_count}</TableCell>
                            <TableCell className="text-right align-top">{effort.artifact_count}</TableCell>
                            <TableCell className="text-right align-top text-muted-foreground">{shortDate(effort.last_activity_at)}</TableCell>
                          </TableRow>
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

export function SessionsView() {
  const sessions = useResource("sessions", (signal) => api.sessions(signal));
  const [attachment, setAttachment] = useState("all");
  const [harness, setHarness] = useState("all");
  // CLI runs, such as claude -p and opencode run, are hidden until asked for. A session whose origin is
  // unknown counts as interactive.
  const [origin, setOrigin] = useState("interactive");

  return (
    <>
      <PageHeader title="Sessions" badges={sessions.state === "ready" ? <span className="text-sm text-muted-foreground">{plural(sessions.value.length, "root session")}</span> : null} />
      <PageBody>
        <Loaded resource={sessions}>
          {(list) => {
            const attached = list.filter((session) => session.efforts.length > 0).length;
            const harnesses = [...new Set(list.map((session) => session.harness))].sort();
            const cliRuns = list.filter((session) => session.origin === "cli").length;

            const shown = list.filter(
              (session) =>
                (attachment === "all" || (attachment === "attached") === session.efforts.length > 0) &&
                (harness === "all" || session.harness === harness) &&
                (origin === "all" || (origin === "cli") === (session.origin === "cli"))
            );

            return (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Filter
                    value={attachment}
                    onChange={setAttachment}
                    options={[
                      { value: "all", label: `All ${list.length}` },
                      { value: "attached", label: `Attached ${attached}` },
                      { value: "unattached", label: `Unattached ${list.length - attached}` }
                    ]}
                  />
                  <Filter
                    value={harness}
                    onChange={setHarness}
                    options={[{ value: "all", label: "All harnesses" }, ...harnesses.map((name) => ({ value: name, label: harnessName(name) }))]}
                  />
                  <Filter
                    value={origin}
                    onChange={setOrigin}
                    options={[
                      { value: "interactive", label: `Interactive ${list.length - cliRuns}` },
                      { value: "cli", label: `CLI runs ${cliRuns}` },
                      { value: "all", label: "Both" }
                    ]}
                  />
                </div>
                {shown.length === 0 ? (
                  <EmptyList title="No sessions here" description="Sessions are recorded when a harness with the Cairn plugin or hooks starts one." />
                ) : (
                  <SessionTable sessions={shown} byDay />
                )}
              </>
            );
          }}
        </Loaded>
      </PageBody>
    </>
  );
}

export function KnowledgeView({ route }: { readonly route: Route }) {
  const articles = useResource("knowledge", (signal) => api.knowledge(signal));

  return (
    <>
      <PageHeader title="Knowledge" badges={articles.state === "ready" ? <span className="text-sm text-muted-foreground">{plural(articles.value.length, "article")}</span> : null} />
      <PageBody>
        <Loaded resource={articles}>
          {(list) =>
            list.length === 0 ? (
              <EmptyList title="No knowledge articles" description="Articles are written up from evidence into knowledge/ at the root, one per subject." />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="w-64">Efforts</TableHead>
                      <TableHead className="w-28">Informed by</TableHead>
                      <TableHead className="w-24">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((article) => (
                      <TableRow key={article.path}>
                        <TableCell className="whitespace-normal">
                          <OpenableTitle
                            icon={BookOpenIcon}
                            title={article.title ?? article.display_path}
                            description={article.description}
                            path={article.display_path}
                            href={fileHref(route, article.path)}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <EffortBadges slugs={article.efforts} />
                        </TableCell>
                        <TableCell className="align-top">{plural(article.informed_by, "file")}</TableCell>
                        <TableCell className="align-top text-muted-foreground">{shortDate(article.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          }
        </Loaded>
      </PageBody>
    </>
  );
}

function PublishedBadge({ published }: { readonly published: DesignItem["published"] }) {
  if (published.state === "current") {
    return <Badge variant="ok">current</Badge>;
  }

  if (published.state === "behind") {
    return <Badge variant="warn">{plural(published.changes, "change")} behind</Badge>;
  }

  return <span className="text-sm text-muted-foreground">not built</span>;
}

export function DesignsView({ route }: { readonly route: Route }) {
  const designs = useResource("designs", (signal) => api.designs(signal));

  return (
    <>
      <PageHeader title="Designs" badges={designs.state === "ready" ? <span className="text-sm text-muted-foreground">{plural(designs.value.length, "design")}</span> : null} />
      <PageBody>
        <Loaded resource={designs}>
          {(list) =>
            list.length === 0 ? (
              <EmptyList title="No designs" description="Designs live in designs/ at the root, kept by the design-docs skill." />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Design</TableHead>
                      <TableHead className="w-60">Efforts</TableHead>
                      <TableHead className="w-40">Decisions</TableHead>
                      <TableHead className="w-40">Published doc</TableHead>
                      <TableHead className="w-24">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((design) => (
                      <TableRow key={design.slug}>
                        <TableCell className="whitespace-normal">
                          <OpenableTitle
                            icon={DraftingCompassIcon}
                            title={design.title}
                            description={design.summary}
                            path={`designs/${design.slug}/`}
                            href={fileHref(route, design.design_path)}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <EffortBadges slugs={design.efforts} />
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-0.5">
                            <span>
                              {design.decisions.decided} of {design.decisions.total} decided
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {design.open_questions === 0 ? "No open questions" : plural(design.open_questions, "open question")}
                              {design.deferred_questions > 0 && ` · ${design.deferred_questions} deferred`}
                            </span>
                            {design.proposals_to_review > 0 && (
                              <Badge variant="warn" className="w-fit">
                                {plural(design.proposals_to_review, "proposal")} to review
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col items-start gap-1">
                            <PublishedBadge published={design.published} />
                            {design.doc_url !== null && (
                              <a href={design.doc_url} target="_blank" rel="noreferrer" className="text-sm font-medium underline underline-offset-4">
                                Open doc
                                <ExternalLinkIcon className="ml-1 inline size-3 text-muted-foreground" aria-hidden />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">{shortDate(design.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          }
        </Loaded>
      </PageBody>
    </>
  );
}

const kindIcons = new Map<string, LucideIcon>([
  ["meeting", UsersIcon],
  ["email", MailIcon],
  ["chat", MessageCircleIcon],
  ["tickets", TicketIcon]
]);

const kindNames = new Map<string, string>([
  ["meeting", "Meeting"],
  ["email", "Email"],
  ["chat", "Chat"],
  ["tickets", "Ticket"]
]);

function IntakeCell({ intake }: { readonly intake: SourceItem["intake"] }) {
  if (intake.state === "not_reviewed") {
    return <Badge variant="warn">Not reviewed</Badge>;
  }

  if (intake.state === "reviewed_through") {
    return intake.newer > 0 ? (
      <Badge variant="warn">
        {intake.newer} new since {shortDate(intake.through)}
      </Badge>
    ) : (
      <span className="text-sm text-muted-foreground">Reviewed through {shortDate(intake.through)}</span>
    );
  }

  const parts = [
    intake.accepted > 0 ? `${intake.accepted} accepted` : null,
    intake.deferred > 0 ? `${intake.deferred} deferred` : null,
    intake.rejected > 0 ? `${intake.rejected} rejected` : null
  ].filter((part) => part !== null);

  return <span className="text-sm text-muted-foreground">{parts.join(" · ")}</span>;
}

function needsIntake(intake: SourceItem["intake"]): boolean {
  return intake.state === "not_reviewed" || (intake.state === "reviewed_through" && intake.newer > 0);
}

export function SourcesView({ route }: { readonly route: Route }) {
  const sources = useResource("sources", (signal) => api.sources(signal));
  const [kind, setKind] = useState("all");
  const [intake, setIntake] = useState("any");

  return (
    <>
      <PageHeader title="Sources" badges={sources.state === "ready" ? <span className="text-sm text-muted-foreground">{plural(sources.value.length, "source")}</span> : null} />
      <PageBody>
        <Loaded resource={sources}>
          {(list) => {
            const meetings = list.filter((source) => source.kind === "meeting").length;
            const waiting = list.filter((source) => needsIntake(source.intake)).length;

            const shown = list.filter(
              (source) =>
                (kind === "all" || (kind === "meetings") === (source.kind === "meeting")) && (intake === "any" || needsIntake(source.intake))
            );

            return (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Filter
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: "all", label: `All ${list.length}` },
                      { value: "meetings", label: `Meetings ${meetings}` },
                      { value: "threads", label: `Threads ${list.length - meetings}` }
                    ]}
                  />
                  <Filter
                    value={intake}
                    onChange={setIntake}
                    options={[
                      { value: "any", label: "Any intake" },
                      { value: "waiting", label: `Needs intake ${waiting}` }
                    ]}
                  />
                </div>
                {shown.length === 0 ? (
                  <EmptyList title="No sources here" description="Meetings, emails, chats, and tickets are saved under sources/ at the root." />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead className="w-24">Kind</TableHead>
                          <TableHead className="w-60">Efforts</TableHead>
                          <TableHead className="w-52">Intake</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupByDay(shown, (source) => source.date).map((group) => (
                          <Fragment key={group.day}>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableCell colSpan={4} className="py-2 text-sm font-semibold">
                                {group.day}
                              </TableCell>
                            </TableRow>
                            {group.rows.map((source) => (
                              <TableRow key={source.path}>
                                <TableCell className="whitespace-normal">
                                  <OpenableTitle
                                    icon={kindIcons.get(source.kind) ?? InboxIcon}
                                    title={source.title}
                                    description={source.description}
                                    path={source.display_path}
                                    href={fileHref(route, source.path)}
                                  />
                                </TableCell>
                                <TableCell className="align-top">{kindNames.get(source.kind) ?? source.kind}</TableCell>
                                <TableCell className="align-top">
                                  <EffortBadges slugs={source.efforts} />
                                </TableCell>
                                <TableCell className="align-top">
                                  <IntakeCell intake={source.intake} />
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
