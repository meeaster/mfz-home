import { ParseError } from "./parse";
import { problem } from "./problem";

type Handler = (request: Request, params: Record<string, string>) => Response | Promise<Response>;

type Route = { method: string; pattern: RegExp; names: string[]; handler: Handler };

/** A small method-and-path router. Patterns use `:name` segments. */
export class Router {
  private routes: Route[] = [];

  on(method: string, path: string, handler: Handler): this {
    const names: string[] = [];
    const pattern = new RegExp(`^${path.replace(/:(\w+)/g, (_, name: string) => (names.push(name), "([^/]+)"))}$`);

    this.routes.push({ method, pattern, names, handler });

    return this;
  }

  async handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    let pathMatched = false;

    for (const route of this.routes) {
      const match = route.pattern.exec(pathname);

      if (!match) continue;

      pathMatched = true;

      if (route.method !== request.method) continue;

      const params = Object.fromEntries(route.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));

      try {
        return await route.handler(request, params);
      } catch (error) {
        if (error instanceof ParseError) return problem(400, "Invalid request", error.message);
        throw error;
      }
    }

    return pathMatched ? problem(405, "Method not allowed") : problem(404, "Not found");
  }
}
