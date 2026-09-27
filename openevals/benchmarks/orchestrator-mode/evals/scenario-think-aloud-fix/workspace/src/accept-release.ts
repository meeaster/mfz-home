/** Accept the READY status regardless of case or surrounding spaces. */
export function acceptRelease(status: string): boolean {
  const normalized = status.trim();

  return normalized === "READY";
}
