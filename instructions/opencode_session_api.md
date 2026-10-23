# OpenCode session API

Replace `<sessionID>` with the current conversation's session ID unless the user names another session.

## Moving a session

- **Tool:** Move the current session with the command below. The move applies at the next step boundary.

```sh
opencode api post /api/session/<sessionID>/move --data '{"directory":"<absolute path>"}'
```

## Compacting a session

- **Tool:** For an explicit compaction request, use the command below directly without loading the `opencode` skill. Load `opencode` only if the command fails or the request needs additional procedure.

```sh
opencode api post /api/session/<sessionID>/compact --data '{}'
```

- **Fact:** A successful response confirms that compaction was requested, not completed. It runs at the next safe model-step boundary.
