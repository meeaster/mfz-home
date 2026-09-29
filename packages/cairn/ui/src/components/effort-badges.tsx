import { createContext, useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { effortHref } from "@/lib/route";

// Effort titles by slug, from the sidebar, so any list that only knows slugs can show titles.
export const EffortTitles = createContext<ReadonlyMap<string, string>>(new Map());

export function useEffortTitle(): (slug: string) => string {
  const titles = useContext(EffortTitles);

  return (slug) => titles.get(slug) ?? slug;
}

// The first effort as a badge and the rest as a count, as the lists show them.
export function EffortBadges({ slugs }: { readonly slugs: readonly string[] }) {
  const title = useEffortTitle();
  const [first, ...rest] = slugs;

  if (first === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" asChild>
        <a href={effortHref(first)} className="max-w-52 truncate">
          {title(first)}
        </a>
      </Badge>
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-xs font-medium text-muted-foreground">+{rest.length}</span>
          </TooltipTrigger>
          <TooltipContent>{rest.map(title).join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
