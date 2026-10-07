import { useSyncExternalStore } from "react";

export type Route =
  | { readonly view: "efforts" }
  | { readonly view: "effort"; readonly slug: string }
  | { readonly view: "sessions" }
  | { readonly view: "session"; readonly key: string }
  | { readonly view: "knowledge" }
  | { readonly view: "article"; readonly path: string }
  | { readonly view: "origins" }
  | { readonly view: "designs" }
  | { readonly view: "links" }
  | { readonly view: "sources" };

export type Location = {
  readonly route: Route;
  // The file open in the viewer, if any.
  readonly file: string | null;
};

function parseRoute(path: string): Route {
  const [first, second] = path.split("/").filter((part) => part !== "").map(decodeURIComponent);

  if (first === "efforts" && second !== undefined) {
    return { view: "effort", slug: second };
  }

  if (first === "sessions" && second !== undefined) {
    return { view: "session", key: second };
  }

  if (first === "knowledge" && second !== undefined) {
    return { view: "article", path: second };
  }

  if (first === "sessions" || first === "knowledge" || first === "designs" || first === "sources" || first === "links" || first === "origins") {
    return { view: first };
  }

  return { view: "efforts" };
}

export function parseLocation(hash: string): Location {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?");

  return { route: parseRoute(path), file: new URLSearchParams(query).get("file") };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);

  return () => window.removeEventListener("hashchange", onChange);
}

export function useLocation(): Location {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);

  return parseLocation(hash);
}

export function routeHref(route: Route): string {
  switch (route.view) {
    case "effort":
      return `#/efforts/${encodeURIComponent(route.slug)}`;
    case "session":
      return `#/sessions/${encodeURIComponent(route.key)}`;
    case "article":
      return `#/knowledge/${encodeURIComponent(route.path)}`;
    default:
      return `#/${route.view}`;
  }
}

export const effortHref = (slug: string): string => routeHref({ view: "effort", slug });

export const sessionHref = (key: string): string => routeHref({ view: "session", key });

export const articleHref = (path: string): string => routeHref({ view: "article", path });

// The current page with a file open in the viewer, or closed when path is null.
export function fileHref(route: Route, path: string | null): string {
  return path === null ? routeHref(route) : `${routeHref(route)}?file=${encodeURIComponent(path)}`;
}
