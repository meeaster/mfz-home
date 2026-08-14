/**
 * The pinned V2 API can register tools and mutate provider context, but it
 * cannot yet port advisor safely:
 *
 * - there is no command lifecycle hook for explicit /consult-advisor
 * - there is no chat.message hook for natural-language authorization
 * - the server plugin API has no session message-list/transcript operation
 * - tool after-hooks expose immutable results, so V1 output mutation cannot
 *   be preserved
 *
 * Keep this entrypoint quarantined until those capabilities have a native API.
 * In particular, do not cast the V1 client or execute the V1 implementation
 * through a fabricated V2 session interface.
 */
export const V2_ADVISOR_BLOCKER =
  "V2 advisor is quarantined: origin/v2 lacks command lifecycle and chat.message hooks for manual authorization, a session message-list API for transcript construction, and mutable tool after-hook results for preserving advisor metadata/output.";

// This is the object consumed by origin/v2's Plugin.define API. It remains
// disabled until the missing authorization and transcript surfaces exist.
export default {
  id: "advisor",
  setup() {
    console.warn(`[advisor] ${V2_ADVISOR_BLOCKER}`);
  },
};
