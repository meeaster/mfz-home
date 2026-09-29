import { MessagesSquareIcon } from "lucide-react";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SessionListItem } from "@/lib/api";
import { groupByDay, time } from "@/lib/format";
import { sessionHref } from "@/lib/route";
import { EffortBadges } from "./effort-badges";

const harnessNames = new Map<string, string>([
  ["opencode", "OpenCode"],
  ["claude-code", "Claude Code"]
]);

export function harnessName(harness: string): string {
  return harnessNames.get(harness) ?? harness;
}

function SessionCell({ session }: { readonly session: SessionListItem }) {
  const nativeId = session.key.slice(session.key.indexOf(":") + 1);

  return (
    <div className="flex items-start gap-3">
      <MessagesSquareIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <a href={sessionHref(session.key)} className="font-medium hover:underline">
            {session.title ?? "Untitled"}
          </a>
          {session.agent !== null && <Badge variant="outline">{session.agent}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {session.description ?? [session.cwd, session.key].filter((part) => part !== null).join("  ·  ")}
        </p>
        {session.description !== null && <p className="font-mono text-xs text-muted-foreground">{nativeId}</p>}
      </div>
    </div>
  );
}

type Props = {
  readonly sessions: readonly SessionListItem[];
  // Lists group their rows under the day each session was last active.
  readonly byDay?: boolean;
};

export function SessionTable({ sessions, byDay = false }: Props) {
  const groups = byDay ? groupByDay(sessions, (session) => session.last_activity_at) : [{ day: "", rows: [...sessions] }];

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead className="w-28">Harness</TableHead>
            <TableHead className="w-60">Efforts</TableHead>
            <TableHead className="w-16 text-right">Files</TableHead>
            <TableHead className="w-20 text-right">Children</TableHead>
            <TableHead className="w-24 text-right">Last active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <Fragment key={group.day}>
              {byDay && (
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={6} className="py-2 text-sm font-semibold">
                    {group.day}
                  </TableCell>
                </TableRow>
              )}
              {group.rows.map((session) => (
                <TableRow key={session.key}>
                  <TableCell className="align-top whitespace-normal">
                    <SessionCell session={session} />
                  </TableCell>
                  <TableCell className="align-top">{harnessName(session.harness)}</TableCell>
                  <TableCell className="align-top">
                    <EffortBadges slugs={session.efforts} />
                  </TableCell>
                  <TableCell className="text-right align-top">{session.file_count}</TableCell>
                  <TableCell className="text-right align-top">{session.child_count === 0 ? "—" : session.child_count}</TableCell>
                  <TableCell className="text-right align-top text-muted-foreground">{time(session.last_activity_at)}</TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
