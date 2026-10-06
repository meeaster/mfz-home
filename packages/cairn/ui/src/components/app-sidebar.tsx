import {
  BookOpenIcon,
  DraftingCompassIcon,
  InboxIcon,
  LayersIcon,
  LinkIcon,
  MessagesSquareIcon,
  MoonIcon,
  MountainIcon,
  SunIcon,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import type { Resource, SidebarData } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { routeHref, type Route } from "@/lib/route";
import type { Theme } from "@/lib/theme";

type BrowseItem = {
  readonly view: "efforts" | "designs" | "links" | "sessions" | "knowledge" | "sources";
  readonly label: string;
  readonly icon: LucideIcon;
};

// The work the human reads first, then the material agents keep for it.
const groups: readonly { readonly label: string; readonly items: readonly BrowseItem[] }[] = [
  {
    label: "Work",
    items: [
      { view: "efforts", label: "Efforts", icon: LayersIcon },
      { view: "designs", label: "Designs", icon: DraftingCompassIcon },
      { view: "links", label: "Jira and Confluence", icon: LinkIcon }
    ]
  },
  {
    label: "Agent material",
    items: [
      { view: "sessions", label: "Sessions", icon: MessagesSquareIcon },
      { view: "knowledge", label: "Knowledge", icon: BookOpenIcon },
      { view: "sources", label: "Sources", icon: InboxIcon }
    ]
  }
];

// Which browse item a route belongs to: an effort's page sits under Efforts, a session's under Sessions.
function browseView(route: Route): BrowseItem["view"] {
  switch (route.view) {
    case "effort":
      return "efforts";
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
  const current = browseView(route);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent">
            <MountainIcon className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Cairn</span>
            <span className="text-xs text-muted-foreground">Your work</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
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
