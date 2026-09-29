import { useMemo } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { EffortTitles } from "@/components/effort-badges";
import { FileViewer } from "@/components/file-viewer";
import { api, useResource } from "@/lib/api";
import { fileHref, useLocation, type Route } from "@/lib/route";
import { useTheme } from "@/lib/theme";
import { EffortView } from "@/views/effort";
import { DesignsView, EffortsView, KnowledgeView, SessionsView, SourcesView } from "@/views/lists";
import { SessionView } from "@/views/session";

function routeKey(route: Route): string {
  return route.view === "effort" ? `effort:${route.slug}` : route.view === "session" ? `session:${route.key}` : route.view;
}

function Page({ route }: { readonly route: Route }) {
  switch (route.view) {
    case "efforts":
      return <EffortsView />;
    case "effort":
      return <EffortView slug={route.slug} route={route} />;
    case "sessions":
      return <SessionsView />;
    case "session":
      return <SessionView sessionKey={route.key} route={route} />;
    case "knowledge":
      return <KnowledgeView route={route} />;
    case "designs":
      return <DesignsView route={route} />;
    case "sources":
      return <SourcesView route={route} />;
  }
}

export function App() {
  const { route, file } = useLocation();
  const [theme, setTheme] = useTheme();
  const sidebar = useResource("sidebar", (signal) => api.sidebar(signal));

  const titles = useMemo(() => {
    const map = new Map<string, string>();

    if (sidebar.state === "ready") {
      for (const group of sidebar.value.initiatives) {
        for (const effort of group.efforts) {
          map.set(effort.slug, effort.title);
        }
      }
    }

    return map;
  }, [sidebar]);

  const navigate = (href: string) => {
    window.location.hash = href;
  };

  return (
    <TooltipProvider>
      <EffortTitles.Provider value={titles}>
        <SidebarProvider>
          <AppSidebar data={sidebar} route={route} theme={theme} onTheme={setTheme} />
          <SidebarInset>
            <div className="flex h-10 items-center px-4 md:hidden">
              <SidebarTrigger />
            </div>
            {/* A new key remounts the page, so tabs and filters start fresh on each effort or session. */}
            <Page key={routeKey(route)} route={route} />
          </SidebarInset>
        </SidebarProvider>
        {file !== null && (
          <FileViewer key={file} path={file} onOpen={(path) => navigate(fileHref(route, path))} onClose={() => navigate(fileHref(route, null))} />
        )}
      </EffortTitles.Provider>
    </TooltipProvider>
  );
}
