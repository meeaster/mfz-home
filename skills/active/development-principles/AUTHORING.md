# development-principles

## Intent

The human's engineering preferences for design, implementation, testing, refactoring, and review: readable use cases, boundaries that earn their cost, trusted values, proportionate complexity, and tests that earn their runtime. Available to workflows and agents that need software judgment, including delegated work where inline guidance gets lost.

Not for: workflow steps, test commands, or completion checklists, which belong to the owning workflow and repository; a generic architecture handbook; non-software work.

Success: clear, native code and durable verification within accepted scope, without the skill being pulled into every engineering task.

## Scenarios

- **Explicit request** for a maintainability review, or a workflow or agent instruction that names the skill: loads and applies it within scope.
- **Ordinary feature work or design comparison** without naming it, coordinating or dispatching settled work, non-software work: doesn't load.
- **Simple use case**: direct implementation, no mandatory controller, service, and repository chain.
- **Growing handler** mixing domain calculation and executable setup, with tests importing through the executable: an explicit split or no-split decision, not one driven by file length.
- **Similar-looking calculations that change for different reasons** stay separate; **one authorization rule** shared by callers gets centralized without waiting for a third copy.
- **Ambiguous payment outcome that could double-charge on retry**: handled now; YAGNI doesn't excuse current-contract risk.
- **Narrow feature exposing a larger restructuring opportunity**: stays narrow and proposes the larger change separately.
- **New project**: a minimal runner with representative unit and real-boundary integration tests from the start; the default test command runs only the fast lane.
- **Small change in a project without tests**: weighs setup cost against risk instead of adding infrastructure by reflex.
- **Agent compresses workflow steps onto single lines**: scannable formatting wins over fewer lines.

## Decisions

- **Explicit loading only** (human, 2026-09-22). Engineering tasks should exercise model defaults; in question-only probes on 2026-09-16, agents answered design questions well without it, and loading it everywhere added context to every delegated session. OpenCode enforces this with `opencode/autoinvoke: false`; existing specialist consumers still load it by name. A revision that day missed the flag and the human had it added.
- **Engineering judgment only, no workflow mechanics.** Earlier versions carried test lanes and completion checks, which conflicted with orchestration workflows that own those steps.
- **Structural decisions belong to design and coordination, not narrow implementation** (human, 2026-08-20). The human plans before implementing, so file-boundary questions should surface then. A longitudinal experiment had pushed extraction onto feature workers, which reorganized code nobody had accepted; implementation now honors accepted boundaries and verification reports drift.
- **A material design states its split or no-split decision.** Two design passes that loaded the skill still omitted file organization (2026-08-20).
- **Tests from the start, fast by default** (human, 2026-08-20). Tests help models tell whether their code works; workers relying on smoke checks missed a range-scaling defect until CLI tests were added. Agents habitually run the default test command, so it runs only unit tests; integration tests need an explicit command and should stay representative rather than exhaustive.
- **Readable formatting** (human, 2026-08-20). Agents compressed TypeScript workflows onto single lines and the style spread; "simple" means fewer concepts, not fewer lines.
- **Documented high-consequence risks justify handling before an incident.** Preserve this against YAGNI readings.
- **Renamed from `code-like-luke`** (human, 2026-08-19), because it now covers the whole development lifecycle. The human's earlier principles from global instructions were folded in where they weren't already covered.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [Code Like Luke gist](https://gist.github.com/Hona/53142c07c9decb735392f132ace34003) | inspiration, not pinned | Original basis. Local additions: risk-proportional failure handling, accepted structural scope, behavioral evidence, and the split between judgment and workflow. Don't restore the gist mechanically |
| Ousterhout, [deep modules](https://stanford.edu/~ouster/cgi-bin/aposd.php) | concept | A boundary's worth is hidden complexity against interface cost; one implementation can justify it |
| Bernhardt, [Boundaries](https://www.destroyallsoftware.com/talks/boundaries); Fowler, [Tell, Don't Ask](https://martinfowler.com/bliki/TellDontAsk.html) | concept | Separate domain from infrastructure without hiding necessary queries or coordination |
| King, [Parse, Don't Validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/); Wlaschin, [making illegal states unrepresentable](https://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/) | concept | Trusted values and valid states, without banning legitimate concurrent states or wrapping every primitive |
| Fowler, [YAGNI](https://martinfowler.com/bliki/Yagni.html) | concept | No speculative capabilities, but handle credible failures of current requirements |
| Muratori, [Semantic Compression](https://caseymuratori.com/blog_0015); Metz, [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) | concept | Share by common meaning and reason to change |
| Bogard, [Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/) | concept | Organize around cohesive use cases, no fixed layout |
