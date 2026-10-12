/** A JSON value as a request body decodes to. */
export type Json = string | number | boolean | null | Json[] | JsonObject;

export type JsonObject = { [field: string]: Json };

/** A request value that failed to parse; the router answers it with a 400 problem. */
export class ParseError extends Error {}

/** The request's JSON object body. */
export async function readBody(request: Request): Promise<JsonObject> {
  let body: Json;

  try {
    body = await request.json();
  } catch {
    throw new ParseError("The request body must be JSON");
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new ParseError("The request body must be a JSON object");

  return body;
}

export function requireString(body: JsonObject, field: string): string {
  const value = body[field];

  if (typeof value !== "string" || value.trim() === "") throw new ParseError(`${field} must be a non-empty string`);

  return value.trim();
}

/** A whole number of at least `min`. */
export function requireInteger(body: JsonObject, field: string, min: number): number {
  const value = body[field];

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw new ParseError(`${field} must be a whole number of at least ${min}`);

  return value;
}

/** A positive integer id from a path segment. */
export function parseId(value: string, name = "id"): number {
  if (!/^[1-9][0-9]*$/.test(value)) throw new ParseError(`${name} must be a positive integer`);

  return Number(value);
}
