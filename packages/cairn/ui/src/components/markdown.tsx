import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ResolvedLink = {
  readonly href: string;
  readonly external: boolean;
};

// A link inside a file: another file opens in the viewer, relative to the file's folder; anything with a scheme opens
// in a new tab.
function resolveLink(href: string, folder: string): ResolvedLink {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) {
    return { href, external: !href.startsWith("#") };
  }

  const [target = "", anchor] = href.split("#");
  const parts = target.startsWith("/") ? [] : folder.split("/");

  for (const part of target.split("/")) {
    if (part === "..") {
      parts.pop();
    } else if (part !== "." && part !== "") {
      parts.push(part);
    }
  }

  const path = `/${parts.filter((part) => part !== "").join("/")}`;

  return { href: `?file=${encodeURIComponent(path)}${anchor === undefined ? "" : `#${anchor}`}`, external: false };
}

function components(folder: string, onOpen: (path: string) => void): Components {
  return {
    h1: (props) => <h1 className="mt-2 mb-3 font-heading text-2xl font-semibold tracking-tight" {...props} />,
    h2: (props) => (
      <>
        <h2 className="mt-6 mb-2 font-heading text-lg font-semibold" {...props} />
        <Separator className="mb-3" />
      </>
    ),
    h3: (props) => <h3 className="mt-4 mb-2 font-semibold" {...props} />,
    p: (props) => <p className="my-2 leading-7" {...props} />,
    ul: (props) => <ul className="my-2 ml-6 list-disc [&>li]:mt-1" {...props} />,
    ol: (props) => <ol className="my-2 ml-6 list-decimal [&>li]:mt-1" {...props} />,
    blockquote: (props) => <blockquote className="my-3 border-l-2 pl-4 text-muted-foreground italic" {...props} />,
    hr: () => <Separator className="my-4" />,
    pre: (props) => <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-4 text-sm" {...props} />,
    code: ({ className, ...props }: ComponentProps<"code">) =>
      className === undefined ? (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]" {...props} />
      ) : (
        <code className={`font-mono ${className}`} {...props} />
      ),
    table: (props) => (
      <div className="my-3 overflow-hidden rounded-lg border">
        <Table {...props} />
      </div>
    ),
    thead: (props) => <TableHeader {...props} />,
    tbody: (props) => <TableBody {...props} />,
    tr: (props) => <TableRow {...props} />,
    th: (props) => <TableHead {...props} />,
    td: (props) => <TableCell className="whitespace-normal" {...props} />,
    a: ({ href = "", children }) => {
      const link = resolveLink(href, folder);

      if (link.external) {
        return (
          <a href={link.href} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
            {children}
          </a>
        );
      }

      const path = new URLSearchParams(link.href.replace(/^\?/, "").split("#")[0]).get("file");

      return (
        <a
          href={link.href}
          className="font-medium underline underline-offset-4"
          onClick={(event) => {
            // The app routes through the hash, so an in-page anchor would navigate away; only file links act.
            event.preventDefault();

            if (path !== null) {
              onOpen(path);
            }
          }}
        >
          {children}
        </a>
      );
    }
  };
}

type Props = {
  readonly content: string;
  // The folder holding the file, for its relative links.
  readonly folder: string;
  readonly onOpen: (path: string) => void;
};

export function Markdown({ content, folder, onOpen }: Props) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components(folder, onOpen)}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
