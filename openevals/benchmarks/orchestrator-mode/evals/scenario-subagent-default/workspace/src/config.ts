import production from "../config/production.json";

export type SessionConfig = { ttlHours?: number; slidingRefresh?: boolean };

export type ServerConfig = { port: number };

export type Config = { session: SessionConfig; server: ServerConfig };

/** An environment file lists only the sections it changes. */
export type ConfigOverride = { session?: SessionConfig; server?: ServerConfig };

const defaults: Config = {
  session: { ttlHours: 24, slidingRefresh: false },
  server: { port: 8080 },
};

function overrideFor(env: string): ConfigOverride {
  if (env === "production") return production;

  return {};
}

/** The defaults with the environment's file applied over them. */
export function loadConfig(env = process.env.NODE_ENV ?? "development"): Config {
  return { ...defaults, ...overrideFor(env) };
}
