# Outcome

The 2026-07-10 smoke run passed. Axis setup copied the sentinel skill into the
isolated OpenCode home, and the report recorded OpenCode loading it from:

`/tmp/axis-.../home/.config/opencode/skills/axis-skill-probe`

The agent then returned `AXIS_SKILL_OK_7F3C` exactly.

This proves skill bootstrap and explicit invocation only. The probe completed
without `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`; it does not prove paid-provider
authentication or establish the model Axis selected. The real user-invoked
skill must likewise be named explicitly in the scenario prompt.

Additional smoke runs passed on 2026-07-10:

- `project-skill-access` loaded a skill from
  `/tmp/axis-.../work/.claude/skills/axis-project-skill-probe` even though the
  Axis workspace was not initialized as a Git repository.
- `skill-resource-action` loaded the bundled `references/expected.txt` file
  and created the captured `axis-resource-artifact.txt` with exactly
  `AXIS_RESOURCE_ARTIFACT_OK_A2V6`.
- `skill-composition` loaded a project-local outer skill and a global inner
  skill. The captured `composition-artifact.txt` contained the inner skill's
  dependency-only token, and the final response contained the outer sentinel.

This proves instruction-level skill composition: the outer skill can direct
the agent to load another discoverable skill. It is not formal dependency
resolution between skills.

Axis 1.17.0 cannot score an OpenCode run when its configured model contains
`/`: the model label is used in a raw-report filename and becomes a path. The
OpenCode ACP adapter ignores that model setting, so the judged-run config omits
it rather than misrepresenting the model in its report label.

The scored composition run selected `claude-code|opus` with `effort: high` as
its configured judge. Axis recorded that configuration, but its goal score fell
back to zero with `Failed to parse judge response`; Axis does not preserve the
judge's raw response, so this is not yet a valid Opus-scored evaluation. Source
inspection also found that the judge path does not apply its temporary HOME to
the spawned process, so Claude currently inherits the host environment.

The Codex composition run passed using the Sentry-style `skills` configuration
instead of manual setup copying. Axis materialized both declared skills under
`.agents/skills/`; Codex read both `SKILL.md` files, wrote the inner token to
the captured artifact, and returned the outer sentinel. This was an
execution-only probe because it used `--no-score`. It also recorded 51,711
input tokens and 44,032 cache-read tokens for this tiny task, a cost signal to
investigate before expanding the suite.

The same Codex probe passed with `gpt-5.6-terra` and
`model_reasoning_effort="medium"`. Axis recorded both settings and its native
Codex adapter forwards them to the CLI. This run recorded 38,610 input tokens
and 34,560 cache-read tokens, confirming that the context-cost concern remains
even at medium reasoning.

Next question: can a frozen, sanitized advisor-session fixture provide enough
evidence for `advisor-evaluation` to perform its procedure in the same setup?
