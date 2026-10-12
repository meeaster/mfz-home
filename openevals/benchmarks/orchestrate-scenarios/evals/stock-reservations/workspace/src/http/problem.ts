/** An RFC 9457 problem details response. */
export function problem(status: number, title: string, detail?: string): Response {
  return Response.json({ type: "about:blank", status, title, detail }, { status, headers: { "content-type": "application/problem+json" } });
}
