import { useEffect, useRef, useState } from "react";
import type {
  DesignItem,
  EffortListItem,
  EffortPage,
  FilePage,
  KnowledgeItem,
  SessionListItem,
  SessionPage,
  SidebarData,
  SourceItem
} from "../../../src/ui/api.ts";

export type * from "../../../src/ui/api.ts";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessage(body: string, status: number): string {
  try {
    const parsed: { error?: string } = JSON.parse(body);

    return parsed.error ?? `Request failed (${status})`;
  } catch {
    return `Request failed (${status})`;
  }
}

async function get<Result>(path: string, signal?: AbortSignal): Promise<Result> {
  const response = await fetch(path, { signal });
  const body = await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(body, response.status));
  }

  // SAFETY: the server serialises the src/ui/api.ts type its route promises, and this build ships with that server.
  return JSON.parse(body) as Result;
}

export const api = {
  sidebar: (signal?: AbortSignal) => get<SidebarData>("/api/sidebar", signal),
  efforts: (signal?: AbortSignal) => get<EffortListItem[]>("/api/efforts", signal),
  effort: (slug: string, signal?: AbortSignal) => get<EffortPage>(`/api/efforts/${encodeURIComponent(slug)}`, signal),
  sessions: (signal?: AbortSignal) => get<SessionListItem[]>("/api/sessions", signal),
  session: (key: string, signal?: AbortSignal) => get<SessionPage>(`/api/sessions/${encodeURIComponent(key)}`, signal),
  knowledge: (signal?: AbortSignal) => get<KnowledgeItem[]>("/api/knowledge", signal),
  designs: (signal?: AbortSignal) => get<DesignItem[]>("/api/designs", signal),
  sources: (signal?: AbortSignal) => get<SourceItem[]>("/api/sources", signal),
  file: (path: string, signal?: AbortSignal) => get<FilePage>(`/api/file?path=${encodeURIComponent(path)}`, signal)
};

export async function openFolder(path: string): Promise<void> {
  const response = await fetch("/api/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path })
  });

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(await response.text(), response.status));
  }
}

export type Resource<Value> =
  | { readonly state: "loading" }
  | { readonly state: "error"; readonly error: Error }
  | { readonly state: "ready"; readonly value: Value };

// Loads a value whenever the key changes, dropping responses for keys that are no longer current.
export function useResource<Value>(key: string, load: (signal: AbortSignal) => Promise<Value>): Resource<Value> {
  const [resource, setResource] = useState<{ key: string; value: Resource<Value> }>({ key, value: { state: "loading" } });

  // The key names what load fetches, so a new load function for the same key isn't a reason to fetch again.
  const latestLoad = useRef(load);

  latestLoad.current = load;

  useEffect(() => {
    const controller = new AbortController();

    setResource({ key, value: { state: "loading" } });
    latestLoad.current(controller.signal).then(
      (value) => setResource({ key, value: { state: "ready", value } }),
      (error: Error) => {
        if (!controller.signal.aborted) {
          setResource({ key, value: { state: "error", error } });
        }
      }
    );

    return () => controller.abort();
  }, [key]);

  return resource.key === key ? resource.value : { state: "loading" };
}
