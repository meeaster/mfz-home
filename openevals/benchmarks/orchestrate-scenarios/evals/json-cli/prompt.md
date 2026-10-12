Load the orchestrate skill.

I want a small CLI in this repo that pretty-prints JSON. I should be able to run `bun run fmt <file>` or pipe JSON into `bun run fmt`. Indent 2 spaces by default, with an `--indent <n>` option, and exit non-zero with a clear error on invalid JSON. Keep it dependency-free. Build it and get it reviewed.

Don't run anything in the background. Running things in parallel is fine, but wait for them to finish.
