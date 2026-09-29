import { BookOpenIcon, CopyIcon, FolderOpenIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, openFolder, useResource, type FilePage } from "@/lib/api";
import { artifactIcon, dateTime } from "@/lib/format";
import { sessionHref } from "@/lib/route";
import { Markdown } from "./markdown";

type Mode = "rendered" | "raw";

const omittedText: Readonly<Record<NonNullable<FilePage["omitted"]>, string>> = {
  binary: "This is a binary file. Open its folder to view it.",
  too_large: "This file is too large to show here. Open its folder to view it.",
  missing: "The catalog records this file, but it's no longer on disk."
};

function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

function RawLines({ content }: { readonly content: string }) {
  const lines = content.replace(/\n$/, "").split("\n");

  return (
    <pre className="overflow-x-auto rounded-lg bg-muted py-3 font-mono text-xs leading-6">
      {lines.map((line, index) => (
        <div key={index} className="flex">
          <span className="w-12 shrink-0 pr-4 text-right text-muted-foreground select-none">{index + 1}</span>
          <span className="pr-4 whitespace-pre">{line}</span>
        </div>
      ))}
    </pre>
  );
}

type HeaderProps = {
  readonly page: FilePage;
  readonly mode: Mode;
  readonly canRender: boolean;
  readonly onMode: (mode: Mode) => void;
  readonly onOpen: (path: string) => void;
};

function ViewerHeader({ page, mode: current, canRender, onMode, onOpen }: HeaderProps) {
  const artifact = page.artifact;
  const Icon = artifact === null ? null : artifactIcon(artifact);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {Icon !== null && <Icon className="size-4 text-muted-foreground" aria-hidden />}
        <DialogTitle className="text-lg">{artifact?.title ?? page.display_path.split("/").at(-1)}</DialogTitle>
        {artifact !== null && <Badge variant="outline">{artifact.category ?? "undescribed"}</Badge>}
        <div className="ml-auto flex items-center gap-1">
          {canRender && (
            <ToggleGroup type="single" variant="outline" size="sm" value={current} onValueChange={(value) => value !== "" && onMode(value === "raw" ? "raw" : "rendered")}>
              <ToggleGroupItem value="rendered">Rendered</ToggleGroupItem>
              <ToggleGroupItem value="raw">Raw</ToggleGroupItem>
            </ToggleGroup>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Copy path" onClick={() => void navigator.clipboard.writeText(page.path)}>
                <CopyIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy path</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open folder" onClick={() => void openFolder(page.path)}>
                <FolderOpenIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open folder</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <DialogDescription asChild>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-mono break-all">{page.display_path}</span>
          {artifact?.producer !== null && artifact?.producer !== undefined && (
            <>
              <span aria-hidden>·</span>
              <span>
                Produced by{" "}
                <a className="font-medium text-foreground hover:underline" href={sessionHref(artifact.producer.session)}>
                  {artifact.producer.title ?? artifact.producer.session}
                </a>
              </span>
            </>
          )}
          {artifact !== null && (
            <>
              <span aria-hidden>·</span>
              <span>Captured {dateTime(artifact.captured_at)}</span>
            </>
          )}
          {page.size > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{formatSize(page.size)}</span>
            </>
          )}
        </div>
      </DialogDescription>
      {artifact?.description !== null && artifact?.description !== undefined && (
        <p className="text-sm text-muted-foreground">{artifact.description}</p>
      )}
      {artifact?.written_up_in.map((article) => (
        <button
          key={article.path}
          type="button"
          className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:underline"
          onClick={() => onOpen(article.path)}
        >
          <BookOpenIcon className="size-3.5 text-cat-knowledge" aria-hidden />
          Written up in {article.title ?? article.path.split("/").at(-1)}
        </button>
      ))}
    </>
  );
}

type Props = {
  readonly path: string;
  readonly onOpen: (path: string) => void;
  readonly onClose: () => void;
};

export function FileViewer({ path, onOpen, onClose }: Props) {
  const file = useResource(`file:${path}`, (signal) => api.file(path, signal));
  const [mode, setMode] = useState<Mode>("rendered");
  const markdown = path.endsWith(".md");
  const shownMode: Mode = markdown ? mode : "raw";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="gap-2 border-b p-5 pr-12">
          {file.state === "ready" ? <ViewerHeader page={file.value} mode={shownMode} canRender={markdown} onMode={setMode} onOpen={onOpen} /> : null}
          {file.state !== "ready" && (
            <>
              <DialogTitle>{path.split("/").at(-1)}</DialogTitle>
              <DialogDescription className="font-mono text-xs">{path}</DialogDescription>
            </>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-5">
          {file.state === "loading" && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-7 w-80" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {file.state === "error" && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Couldn't open this file</EmptyTitle>
                <EmptyDescription>{file.error.message}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {file.state === "ready" && file.value.content === null && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nothing to show</EmptyTitle>
                <EmptyDescription>{omittedText[file.value.omitted ?? "missing"]}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {file.state === "ready" &&
            file.value.content !== null &&
            (shownMode === "rendered" ? <Markdown content={file.value.content} folder={folderOf(file.value.path)} onOpen={onOpen} /> : <RawLines content={file.value.content} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
