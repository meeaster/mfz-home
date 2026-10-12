# Running skill-creator's loop in OpenCode

`skill-creator` assumes Claude Code. Its workflow, eval format, grading prompts, and Python scripts work unchanged in OpenCode; only the mechanics below differ. Where this file and `skill-creator` disagree, follow this file.

## Runs

Run each eval as a fresh top-level session with `opencode run`, not a subagent. That lets you choose the model per run and gives you a trace to measure.

- Give each run its own test repository under the eval workspace, and run from inside it: `opencode run --standalone --auto --format json --model <provider/model#variant> --title "<eval>-<config>" "<prompt>" </dev/null > trace.jsonl`
  - `--standalone` starts a private server, so the session uses the test repository as its project.
  - `--auto` approves permission prompts that would otherwise stall a non-interactive run. Use it only in disposable test repositories.
  - `</dev/null` stops `opencode run` from waiting on stdin.
  - When you launch it from inside an OpenCode session, remove `OPENCODE_SESSION_ID` from the child's environment and set `PWD` to the test repository. Otherwise the run inherits the parent session's directory and inspects the wrong repository.
- **With the skill:** copy the skill into the test repository's `.opencode/skills/<name>/`, and start the prompt with "Load the `<name>` skill with the skill tool, then:". An `@<name>` mention isn't reliable from the command line. Confirm in the trace that a `skill` tool call loaded it.
- **Baseline:** the same prompt in an identical repository without the skill: no skill for a new skill, a snapshot of the previous version for a revision. If the skill is also installed globally, the baseline can still see it; test a draft that isn't installed.
- Smoke-test one run and read its trace before launching the rest. Then run the others in parallel, and wait for all of them before grading.

## Timing

There are no subagent completion notices to capture. Build each run's `timing.json` from its trace instead: `total_tokens` is the sum of the `tokens` fields on `step-finish` parts, and `duration_ms` is the last event's `timestamp` minus the first.

## Grading and review

- Grade inline or with a `general` subagent that reads `agents/grader.md`. Use a script for assertions that can be checked mechanically.
- Run `python3 -m scripts.aggregate_benchmark` from the `skill-creator` directory as documented.
- Generate the review page with `generate_review.py --static <file>`. There's no browser server to keep running, so don't background it.

## Description optimization

`run_loop.py`, `run_eval.py`, and `improve_description.py` call `claude -p` and don't work here. For a skill the model should invoke on its own, check triggering with a few `opencode run` prompts that should and shouldn't load it, and look for the `skill` tool call in each trace. User-invoked skills don't need this.

## Cleanup

Each trace event carries a `sessionID`. Delete every eval session with `opencode session delete <id>`, then remove the eval workspace.
