import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { z } from "zod";
import { CairnError, type Cairn } from "../core/db.ts";
import { failureMessage, withCairn } from "../core/operation.ts";
import type {
  DesignItem,
  EffortListItem,
  EffortPage,
  FilePage,
  KnowledgeItem,
  SessionListItem,
  SessionPage,
  LinksPage,
  SidebarData,
  SourceItem
} from "./api.ts";
import {
  builtDoc,
  designList,
  effortList,
  effortPage,
  filePage,
  folderToOpen,
  jiraAndConfluence,
  knowledgeList,
  sessionList,
  sessionPage,
  sidebar,
  sourceList
} from "./views.ts";

export type UiOptions = {
  readonly root: string;
  readonly assets: string;
  readonly host: string;
  readonly port: number;
  readonly now: () => Date;
  readonly openFolder: (folder: string) => void;
};

const contentTypes = new Map<string, string>([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".woff2", "font/woff2"],
  [".json", "application/json; charset=utf-8"]
]);

const openRequest = z.object({ path: z.string().min(1) });

type Payload =
  | SidebarData
  | EffortListItem[]
  | EffortPage
  | SessionListItem[]
  | SessionPage
  | KnowledgeItem[]
  | DesignItem[]
  | SourceItem[]
  | LinksPage
  | FilePage;

type Body = Payload | { readonly error: string } | { readonly opened: string };

type Route = (cairn: Cairn, params: URLSearchParams, match: RegExpExecArray) => Payload;

const routes: readonly (readonly [RegExp, Route])[] = [
  [/^\/api\/sidebar$/, (cairn) => sidebar(cairn)],
  [/^\/api\/efforts$/, (cairn) => effortList(cairn)],
  [/^\/api\/efforts\/([^/]+)$/, (cairn, _params, match) => effortPage(cairn, decodeURIComponent(match[1] ?? ""))],
  [/^\/api\/sessions$/, (cairn) => sessionList(cairn)],
  [/^\/api\/sessions\/([^/]+)$/, (cairn, _params, match) => sessionPage(cairn, decodeURIComponent(match[1] ?? ""))],
  [/^\/api\/knowledge$/, (cairn) => knowledgeList(cairn)],
  [/^\/api\/designs$/, (cairn) => designList(cairn)],
  [/^\/api\/sources$/, (cairn) => sourceList(cairn)],
  [/^\/api\/links$/, (cairn) => jiraAndConfluence(cairn)],
  [/^\/api\/file$/, (cairn, params) => filePage(cairn, params.get("path") ?? "")]
];

// Only requests addressed to this machine are answered, so a page on another site can't reach the catalog
// through a hostname that resolves here.
function localHost(header: string | undefined): boolean {
  if (header === undefined) {
    return false;
  }

  const host = header.replace(/:\d+$/, "");

  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function send(response: ServerResponse, status: number, body: string | Buffer, type: string): void {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(body);
}

function sendJson(response: ServerResponse, status: number, value: Body): void {
  send(response, status, JSON.stringify(value), "application/json; charset=utf-8");
}

function statusFor(error: Error): number {
  if (error instanceof z.ZodError) {
    return 400;
  }

  if (!(error instanceof CairnError)) {
    return 500;
  }

  return error.code === "not_found" ? 404 : error.code === "invalid" ? 400 : 409;
}

// Built files by path, falling back to index.html so the app handles its own routes.
function sendAsset(response: ServerResponse, assets: string, pathname: string): void {
  const index = join(assets, "index.html");

  if (!existsSync(index)) {
    send(response, 503, "The UI isn't built. Run `pnpm --filter @mfz/cairn build`.", "text/plain; charset=utf-8");

    return;
  }

  const requested = normalize(join(assets, decodeURIComponent(pathname)));
  const inside = requested.startsWith(`${assets}${sep}`) && existsSync(requested) && statSync(requested).isFile();
  const file = inside ? requested : index;

  send(response, 200, readFileSync(file), contentTypes.get(extname(file)) ?? "application/octet-stream");
}

// A malformed escape in the path names no design.
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function handle(options: UiOptions, request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!localHost(request.headers.host)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");

    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const docName = /^\/docs\/([^/]+)\/?$/.exec(url.pathname)?.[1];

  // A design's built doc is one self-contained HTML file, served as it is so it opens in its own tab.
  if (docName !== undefined) {
    const doc = builtDoc(options.root, safeDecode(docName));

    if (doc === null) {
      send(response, 404, "This design has no built doc. Build it with the design-docs skill's doc.py build.", "text/plain; charset=utf-8");
    } else {
      send(response, 200, readFileSync(doc), "text/html; charset=utf-8");
    }

    return;
  }

  if (!url.pathname.startsWith("/api/")) {
    sendAsset(response, resolve(options.assets), url.pathname);

    return;
  }

  try {
    // Opening a folder is the one action with an effect. A JSON body can't be sent cross-site without a preflight,
    // which this server never approves.
    if (url.pathname === "/api/open" && request.method === "POST") {
      if (request.headers["content-type"] !== "application/json") {
        sendJson(response, 415, { error: "Expected application/json" });

        return;
      }

      const { path } = openRequest.parse(JSON.parse(await readBody(request)));
      const folder = withCairn(options.root, options.now, "hot", (cairn) => folderToOpen(cairn, path));

      options.openFolder(folder);
      sendJson(response, 200, { opened: folder });

      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });

      return;
    }

    for (const [pattern, route] of routes) {
      const match = pattern.exec(url.pathname);

      if (match !== null) {
        sendJson(response, 200, withCairn(options.root, options.now, "hot", (cairn) => route(cairn, url.searchParams, match)));

        return;
      }
    }

    sendJson(response, 404, { error: `No route for ${url.pathname}` });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));

    sendJson(response, statusFor(failure), { error: failureMessage(options.root, `ui ${url.pathname}`, failure, options.now()) });
  }
}

export function startUiServer(options: UiOptions): Promise<Server> {
  const server = createServer((request, response) => {
    void handle(options, request, response);
  });

  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolveServer(server);
    });
  });
}

// Opens a folder in the desktop's file manager: Explorer from WSL, otherwise the platform's opener.
export function openInFileManager(folder: string): void {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [folder]]
      : process.platform === "win32"
        ? ["explorer.exe", [folder]]
        : process.env.WSL_DISTRO_NAME !== undefined
          ? ["explorer.exe", [execFileSync("wslpath", ["-w", folder], { encoding: "utf8" }).trim()]]
          : ["xdg-open", [folder]];

  spawn(command, args, { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
}
