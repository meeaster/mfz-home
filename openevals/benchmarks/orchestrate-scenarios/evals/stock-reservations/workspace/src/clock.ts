/** The source of the current time, in milliseconds since the epoch. */
export type Clock = { now(): number };

export const systemClock: Clock = { now: () => Date.now() };
