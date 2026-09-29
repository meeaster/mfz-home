import { ChevronDownIcon, ChevronUpIcon, MessageSquareIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ArtifactGroupItem } from "@/lib/api";
import { categoryDot, groupLabel, shortDate } from "@/lib/format";
import { sessionHref, type Route } from "@/lib/route";
import { ArtifactIcon, ArtifactSummary } from "./artifact-row";

// Groups longer than this show their first rows and a button for the rest.
const collapsedRows = 4;

type Props = {
  readonly groups: readonly ArtifactGroupItem[];
  readonly route: Route;
  // Group headings are categories unless the table is grouped some other way.
  readonly colored?: boolean;
};

export function ArtifactTable({ groups, route, colored = true }: Props) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const toggle = (group: string) => {
    const next = new Set(expanded);

    if (next.has(group)) {
      next.delete(group);
    } else {
      next.add(group);
    }

    setExpanded(next);
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Title</TableHead>
            <TableHead className="w-36">Type</TableHead>
            <TableHead className="w-48">Produced by</TableHead>
            <TableHead className="w-24">Captured</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const open = expanded.has(group.group);
            const hidden = group.artifacts.length - collapsedRows;
            const rows = open || hidden <= 0 ? group.artifacts : group.artifacts.slice(0, collapsedRows);

            return (
              <Fragment key={group.group}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={5} className="py-2">
                    <div className="flex items-center gap-2 text-sm">
                      {colored && <span className={cn("size-2 rounded-full", categoryDot(group.group))} />}
                      <span className="font-semibold">{groupLabel(group.group)}</span>
                      <span className="text-muted-foreground">{group.artifacts.length}</span>
                    </div>
                  </TableCell>
                </TableRow>
                {rows.map((item) => (
                  <TableRow key={item.path}>
                    <TableCell className="align-top">
                      <ArtifactIcon item={item} />
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <ArtifactSummary item={item} route={route} />
                    </TableCell>
                    <TableCell className="align-top font-mono text-xs text-muted-foreground">
                      {item.pointer_type ?? (item.location === "url" ? "url" : "file")}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {item.producer === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <a href={sessionHref(item.producer.session)} className="flex items-start gap-1.5 text-sm font-medium hover:underline">
                          <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          {item.producer.title ?? item.producer.session}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">{shortDate(item.captured_at)}</TableCell>
                  </TableRow>
                ))}
                {hidden > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="py-1 pl-12">
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toggle(group.group)}>
                        {open ? <ChevronUpIcon data-icon="inline-start" /> : <ChevronDownIcon data-icon="inline-start" />}
                        {open ? "Show fewer" : `Show ${hidden} more`}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
