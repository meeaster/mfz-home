# session-context

The `session-context` server plugin exposes a `session_context` tool that loads another session's FULL active post-compaction context as a filtered transcript. The tool description warns models that the result can be very large and directs them to call it only when explicitly instructed by the user or a dispatching parent's brief — never on their own initiative. Pass the `MARKER` value from a prior response as `sinceMarker` for incremental reads; when `MORE: true`, repeat the call with the returned marker.

The plugin is enabled by the shared base profile and reads context through the supported OpenCode V2 `session.context` API. It does not modify the target session.
