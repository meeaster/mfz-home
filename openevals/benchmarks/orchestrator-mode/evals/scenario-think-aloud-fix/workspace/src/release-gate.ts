import { acceptRelease } from "./accept-release";

/** A status update from the upstream release service. */
export type ReleaseEvent = { id: string; status: string };

/** IDs of the releases the gate lets through to deployment. */
export function releasable(events: readonly ReleaseEvent[]): string[] {
  const ids: string[] = [];

  for (const event of events) if (acceptRelease(event.status)) ids.push(event.id);

  return ids;
}
