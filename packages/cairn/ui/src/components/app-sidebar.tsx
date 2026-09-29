import {
  BookOpenIcon,
  DraftingCompassIcon,
  InboxIcon,
  LayersIcon,
  MessagesSquareIcon,
  MoonIcon,
  MountainIcon,
  SunIcon,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EffortStatus, Resource, SidebarData } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { effortHref, routeHref, type Route } from "@/lib/route";
import type { Theme } from "@/lib/theme";

type BrowseItem = {
  readonly view: "efforts" | "sessions" | "knowledge" | "designs" | "sources";
  readonly label: string;
  readonly icon: LucideIcon;
};

const browse: readonly BrowseItem[] = [
  { view: "efforts", label: "Efforts", icon: LayersIcon },
  { view: "sessions", label: "Sessions", icon: MessagesSquareIcon },
  { view: "knowledge", label: "Knowledge", icon: BookOpenIcon },
  { view: "designs", label: "Designs", icon: DraftingCompassIcon },
  { view: "sources", label: "Sources", icon: InboxIcon }
];

const statusDots: Readonly<Record<EffortStatus, string>> = {
  active: "bg-ok",
  provisional: "bg-warn",
  paused: "bg-muted-foreground",
  done: "bg-muted-foreground/50",
  archived: "bg-muted-foreground/30"
};

// Which browse item a route belongs to, so an effort's page highlights the effort rather than the list.
function browseView(route: Route): BrowseItem["view"] | null {
  switch (route.view) {
    case "effort":
      return null;
    case "session":
      return "sessions";
    default:
      return route.view;
  }
}

type Props = {
  readonly data: Resource<SidebarData>;
  readonly route: Route;
  readonly theme: Theme;
  readonly onTheme: (theme: Theme) => void;
};

export function AppSidebar({ data, route, theme, onTheme }: Props) {
  const [query, setQuery] = useState("");
  const current = browseView(route);
  const needle = query.trim().toLowerCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent">
            <MountainIcon className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Cairn</span>
            <span className="text-xs text-muted-foreground">Catalog</span>
          </div>
        </div>
        <SidebarInput placeholder="Filter efforts" value={query} onChange={(event) => setQuery(event.target.value)} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Browse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {browse.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton asChild isActive={current === item.view}>
                    <a href={routeHref({ view: item.view })}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                  {data.state === "ready" && <SidebarMenuBadge>{data.value.counts[item.view]}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {data.state === "loading" && (
          <div className="flex flex-col gap-2 px-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}
        {data.state === "ready" &&
          data.value.initiatives.map((group) => {
            const efforts = group.efforts.filter((effort) => needle === "" || effort.title.toLowerCase().includes(needle));

            if (efforts.length === 0) {
              return null;
            }

            return (
              <SidebarGroup key={group.initiative ?? "none"}>
                <SidebarGroupLabel>{group.initiative ?? "No initiative tag"}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {efforts.map((effort) => (
                      <SidebarMenuItem key={effort.slug}>
                        <SidebarMenuButton asChild isActive={route.view === "effort" && route.slug === effort.slug}>
                          <a href={effortHref(effort.slug)} title={`${effort.title} · ${effort.status}`}>
                            <span className={cn("size-2 shrink-0 rounded-full", statusDots[effort.status])} />
                            <span className="truncate">{effort.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex min-w-0 flex-col text-xs leading-tight">
            <span className="truncate font-medium">{data.state === "ready" ? data.value.root : ""}</span>
            <span className="text-muted-foreground">
              {data.state === "ready" && data.value.last_backup !== null ? `Backed up ${shortDate(data.value.last_backup)}` : "No backup yet"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label={theme === "dark" ? "Use the light theme" : "Use the dark theme"}
            onClick={() => onTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
