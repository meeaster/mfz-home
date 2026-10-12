# Legacy repository

## The ask

"Add an export option to the reports page in the old billing app." The repository has few tests, no verification skill, and nobody has written down how to run it.

## What should happen

1. **Check what's known.** An explorer looks for the repository's verification article and any knowledge article about the codebase, in the background, while the conversation starts.
2. **Learn to run it first.** If nothing says how to launch and drive the app, an explorer or prototyper works that out before design settles, because the verification plan depends on it. What it learns goes into the verification article.
3. **Plan verification with the design.** The acceptance criteria get their checks and evidence levels. Where the app can't be exercised, the orchestrator raises it now: a way to verify that fits the change (export to a file the check can read) is designed in; anything needing larger infrastructure becomes a gap.
4. **Build, verify, review, and hand off** as in [feature delivery](feature-delivery.md).
5. **Record.** New how-to facts and gaps go into the repository's verification article, so the next change here starts further along.

## What must not happen

- Implementers each rediscover how to start the app.
- Verification gets improvised after the build by adding environment variables or test-only paths to the app.
- What was learned about running the app is lost when the session ends.

## Done looks like

The change verified at the level agreed, and a verification article for the repository that the next session can use.
