import { BookOpenIcon, ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ArtifactItem } from "@/lib/api";
import { artifactIcon, artifactTitle, showsPath } from "@/lib/format";
import { fileHref, type Route } from "@/lib/route";

// Where clicking an artifact goes: the viewer for a file, the page itself for a URL.
export function artifactLink(route: Route, item: ArtifactItem): { href: string; external: boolean } {
  return item.location === "url" ? { href: item.path, external: true } : { href: fileHref(route, item.path), external: false };
}

type Props = {
  readonly item: ArtifactItem;
  readonly route: Route;
};

export function ArtifactIcon({ item }: { readonly item: ArtifactItem }) {
  const Icon = artifactIcon(item);

  return <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />;
}

// Title, state badges, description, where it lives, and the articles it has been written up in.
export function ArtifactSummary({ item, route }: Props) {
  const link = artifactLink(route, item);

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noreferrer" : undefined}
          className="font-medium hover:underline"
        >
          {artifactTitle(item)}
          {link.external && <ExternalLinkIcon className="ml-1 inline size-3 text-muted-foreground" aria-hidden />}
        </a>
        {item.category === null && <Badge variant="warn">undescribed</Badge>}
        {item.status !== "active" && item.status !== "undescribed" && <Badge variant="outline">{item.status}</Badge>}
      </div>
      {item.description !== null && <p className="text-sm text-muted-foreground">{item.description}</p>}
      {showsPath(item) && <p className="font-mono text-xs break-all text-muted-foreground">{item.display_path}</p>}
      {item.written_up_in.map((article) => (
        <a
          key={article.path}
          href={fileHref(route, article.path)}
          className="flex items-center gap-1.5 pt-0.5 text-xs text-muted-foreground hover:underline"
        >
          <BookOpenIcon className="size-3.5 text-cat-knowledge" aria-hidden />
          Written up in {article.title ?? article.path.split("/").at(-1)}
        </a>
      ))}
    </div>
  );
}
