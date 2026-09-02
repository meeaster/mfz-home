export function reactiveSessionID(input: { readonly sessionID: string }) {
  return () => input.sessionID;
}
