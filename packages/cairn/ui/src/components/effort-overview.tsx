import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, DraftingCompassIcon, FileTextIcon, GitBranchIcon, GitPullRequestIcon, LinkIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyList } from "@/components/page";
import { JiraCanvas } from "@/components/jira-canvas";
import type { DeliveredDesign, EffortPage, PageLink } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { effortHref, fileHref, type Route } from "@/lib/route";

const relationLabels: Readonly<Record<EffortPage["links"][number]["relation"], string>> = {
  depends_on: "this effort needs it",
  needed_by: "needs this effort",
  split_from: "this effort split from it",
  split_into: "split from this effort",
  related: "related"
};

function Section({ title, aside, children }: { readonly title: string; readonly aside?: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Progress({ design }: { readonly design: DeliveredDesign }) {
  const { total, done, in_progress } = design.plan;
  const segments = Array.from({ length: total }, (_, index) => (index < done ? "bg-ok" : index < done + in_progress ? "bg-cat-deliverable" : "bg-muted"));

  return (
    <div className="flex gap-0.5" aria-label={`${done} of ${total} deliverables done`}>
      {segments.map((colour, index) => (
        <span key={index} className={`h-1.5 flex-1 rounded-full ${colour}`} />
      ))}
    </div>
  );
}

function Designs({ designs }: { readonly designs: readonly DeliveredDesign[] }) {
  return (
    <Card size="sm" className="lg:w-[420px] lg:shrink-0">
      <CardHeader>
        <CardTitle>Designs this effort delivers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {designs.length === 0 && <p className="text-sm text-muted-foreground">No design yet. One shows here once its plan links this effort&apos;s Jira items, or its records belong to the effort.</p>}
        {designs.map((design) => (
          <div key={design.slug} className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <DraftingCompassIcon className="size-4 text-muted-foreground" />
              {design.title}
            </span>
            {design.plan.total > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {design.deliverables.length > 0 ? `Delivers ${design.deliverables.map((deliverable) => deliverable.id).join(", ")} · ` : ""}
                  {design.plan.done} of {design.plan.total} done, {design.plan.in_progress} in progress
                </span>
                <Progress design={design} />
              </>
            )}
            {design.doc_url !== null && (
              <span className="flex gap-4 text-sm font-medium">
                <a href={design.doc_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  Open the doc <ArrowUpRightIcon className="size-3.5 text-muted-foreground" />
                </a>
                {design.plan.total > 0 && (
                  <a href={`${design.doc_url}#plan`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                    Plan <ArrowUpRightIcon className="size-3.5 text-muted-foreground" />
                  </a>
                )}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PageList({ title, description, pages }: { readonly title: string; readonly description: string; readonly pages: readonly PageLink[] }) {
  return (
    <Card size="sm" className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {pages.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        {pages.map((page) => (
          <div key={page.url} className="flex gap-2.5">
            <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <a href={page.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium hover:underline">
                {page.title ?? page.url}
                <ArrowUpRightIcon className="size-3 text-muted-foreground" />
              </a>
              {page.description !== null && <span className="text-xs text-muted-foreground">{page.description}</span>}
              {(page.space !== null || page.version !== null || page.updated !== null) && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {[page.space, page.version === null ? null : `v${page.version}`, page.updated].filter((part) => part !== null).join(" · ")}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EffortOverview({ effort, route }: { readonly effort: EffortPage; readonly route: Route }) {
  const { work } = effort;
  const record = effort.records.find((candidate) => candidate.name === "effort.md") ?? effort.records[0];
  const epics = work.jira.filter((item) => item.type?.toLowerCase() === "epic").length;
  const reads = work.jira.map((item) => item.read_at).filter((read) => read !== null).sort();
  const lastRead = reads.at(-1);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card size="sm" className="flex-1">
          <CardHeader>
            <CardTitle>Where it stands</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm">{effort.summary ?? "No summary yet: effort.md opens with one once the effort has records."}</p>
            {record !== undefined && (
              <a href={fileHref(route, record.path)} className="text-xs text-muted-foreground hover:underline">
                From {record.name} · last activity {dateTime(effort.last_activity_at)}
              </a>
            )}
          </CardContent>
        </Card>
        <Designs designs={work.designs} />
      </div>

      <Section
        title="Jira"
        aside={
          <>
            <span className="text-sm text-muted-foreground">
              {epics} {epics === 1 ? "epic" : "epics"} · {work.jira.length - epics} {work.jira.length - epics === 1 ? "item" : "items"}
            </span>
            {lastRead !== undefined && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCwIcon className="size-3" />
                Read from Jira {dateTime(lastRead)} by an agent
              </span>
            )}
          </>
        }
      >
        {work.jira.length === 0 ? (
          <EmptyList title="No Jira items yet" description="Jira items an agent registers for this effort show up here, one lane per epic." />
        ) : (
          <JiraCanvas items={work.jira} />
        )}
      </Section>

      <Section title="Confluence" aside={<span className="text-sm text-muted-foreground">{work.confluence.length} pages</span>}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <PageList title="Created for this work" description="Pages you published" pages={work.confluence.filter((page) => page.role === "created")} />
          <PageList title="Referenced" description="Other people's pages this work relies on" pages={work.confluence.filter((page) => page.role !== "created")} />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Pull requests and links">
          {work.other.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {work.other.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-sm hover:underline">
              {link.pointer_type === "pull_request" ? <GitPullRequestIcon className="size-4 text-muted-foreground" /> : <LinkIcon className="size-4 text-muted-foreground" />}
              {link.title ?? link.url}
              {link.description !== null && <span className="truncate text-xs text-muted-foreground">{link.description}</span>}
            </a>
          ))}
        </Section>
        <Section title="Related efforts">
          {effort.links.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {effort.links.map((link) => (
            <a key={`${link.relation}-${link.slug}`} href={effortHref(link.slug)} className="flex items-center gap-2.5 text-sm hover:underline">
              {link.relation === "split_from" || link.relation === "split_into" ? (
                <GitBranchIcon className="size-4 text-muted-foreground" />
              ) : link.relation === "needed_by" ? (
                <ArrowLeftIcon className="size-4 text-muted-foreground" />
              ) : (
                <ArrowRightIcon className="size-4 text-muted-foreground" />
              )}
              {link.title}
              <span className="text-xs text-muted-foreground">{relationLabels[link.relation]}</span>
            </a>
          ))}
        </Section>
      </div>
    </div>
  );
}
