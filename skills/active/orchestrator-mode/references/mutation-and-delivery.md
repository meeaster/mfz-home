# Mutation and delivery

## Outcome-scoped authority

A concrete request can authorize several named steps and their necessary inherent operations. Continue without renewed approval while the outcome, target, scope/system boundary, access, consequential cost, risk, reversibility, design assumptions, and acceptance contract remain materially consistent. Ordinary newly discovered implementation details do not invalidate that sequence.

Pause for a changed basis, unresolved consequential choice, failed gate, different procedure, broader or independent outcome, missing authority, or material blocker. Return the result, changed assumption, affected downstream steps, and smallest needed decision. Vague future work is not authority.

Apply role selection from [Routing and roles](routing-and-roles.md) and consultation/review authority from [Design, prototype, and review](design-prototype-and-review.md). Carry explicit human selections of gated named agents and their scope in the brief. Investigation alone authorizes findings; implementation requires an implementation request. Review plus remediation includes corrections and verification, not automatic independent rereviews.

Publication steps remain distinct: commit does not imply push, push does not imply PR or merge, drafting does not imply publication, and one system update does not imply another. A PR request includes necessary in-scope commit and branch push, not merge, deployment, or Jira updates. An explicitly selected artifact-author may publish only when authorized within its owning editorial lifecycle; mechanical Git, deployment, and other publication belong to operator.

Planning artifacts use their owning workflow and grant no implementation authority. Follow the OpenSpec proposal/implementation split in routing. Task-local accepted design remains background; mutation receives a bounded current brief. Split substantial application, behavioral-instruction, and reader-facing authoring responsibilities when their ownership differs, keeping the accepted interface clear.

## Prepare and decompose

Classify preparation before dispatch:

- Keep ordinary instruction discovery, status/diff and Git topology checks, dirty-state preservation, validation selection, artifact safety, and final-state verification with the mutation owner.
- Use separate `inspect` for a requested read-only outcome, absent mutation authority, or readiness dependent on a distinct live system, access boundary, human decision, or uncertainty beyond ordinary operator preflight.
- Use an authorized preparation operator for substantial mechanically separable setup that changes the brief/state or would crowd useful build context. Check its handoff and normally start the build agent fresh. Serialize shared-state preparation and build.

Preserve unrecognized local changes, including untracked source. Before editing, resolve any checkout or isolation decision required by applicable instructions with the human through the coordinator; a promise to preserve files does not replace that decision. Clarify ambiguous “get latest” intent. Worktree creation, Git, Jira, and environment mutations retain their own authority; combine only operations inherent in one explicitly requested transaction or concrete sequence.

Decompose by coherent outcome, ownership, mutable state, dependencies, and compatible acceptance/validation, not file or repository counts. Keep tightly coupled changes together; split independent domains, lifecycle concerns, authority boundaries, or validation environments. Order units by dependencies, normally one coherent outcome per worker. Use optional `coordination.md` for cross-unit criteria, owner, status, and evidence; put a single unit's acceptance in its prompt.

Prefer units reasonably likely to complete within one context window, including required reading, implementation, likely debugging, validation, and completion evidence. Leave room for unexpected work rather than estimating a token quota. Split large features into coherent, independently verifiable outcomes where possible; preserve necessary shared validation after integration. Compaction remains available and does not itself invalidate the unit.

Keep authorized immediate validation and activation with the implementation owner when they complete the same settled outcome. Use a separate operator for a distinct operational outcome, procedure, authority boundary, environment, or useful handoff. This does not extend implementation authority to publication or unrelated operations.

Specify required validation coverage, consequential environments, and any required execution stage. Distinguish instructions naming test lanes from explicit requirements for separate runs. An aggregate that executes the required lanes satisfies their coverage; keep command examples from becoming cumulative obligations in plans or briefs. Preserve explicit execution requirements, or obtain an authorized, scoped exception before substituting for them.

Reuse results while they apply to the current code and environment. Additional execution should resolve a relevant change, missing coverage, contradictory evidence, or a material need for independent confirmation. Select checks by affected behavior and dependencies, including transitive callers and integration boundaries; changed filenames alone do not establish sufficient coverage. Reuse existing coverage maps or gather bounded evidence when selection is materially uncertain. Preserve useful red/green checks without adding a mandatory preparation agent or repeating suites solely because ownership changed.

Make validation through the relevant user-facing boundary part of the completion contract: browser interaction for UI behavior, executable invocation for CLI behavior, or a bounded live request when a claim depends on an external integration. Existing tests can supply that evidence when they exercise the boundary adequately. Add focused runtime checks for material gaps within authorized access and effects; report any unexercised behavior and why. Workers normally own these checks, including omitted completion coverage. When validation is substantial, such as an extended browser session, compare continuing with useful implementation context against a fresh inspector's setup, reconstruction, and defect-handoff costs. Assign bounded validation to a fresh inspector when focused context or independent assurance adds material value. The worker still supplies immediate checks and exact remaining coverage; the inspector reports findings without repair, and the coordinator routes defects and retains final acceptance. An operator owns a distinct operational outcome, not validation merely because it uses a browser or command.

## Worker readiness

Before dispatch, record one explicit decision in the live session or working model and expose it in the brief:

- `ready: direct`: a small self-contained unit with an apparent local pattern and no material external, unfamiliar, version-sensitive, or non-obvious dependency. State the concrete reason.
- `ready: prepared`: checked applicable evidence resolves material implementation ambiguity. Name selected evidence/synthesis paths, status, applicability, and version or freshness limits.

External APIs, library/SDK integrations, unfamiliar CLIs, version-sensitive contracts, and non-obvious integrations select prepared readiness unless current evidence already resolves them. Anticipated worker lookup after dispatch is not preparation. Reuse current evidence first; gather only missing, stale, or conflicting facts likely to change implementation. Use local integration evidence, authoritative version-specific documentation/source, and installed/runtime facts according to the source roles.

Readiness requires no separate file, mandatory research phase, every-dependency research, speculative edge cases, or duplicate immediate worker preflight. Documentation volume is not readiness. Use authorized synthesis if available; otherwise carry necessary reasoning in the brief. A synthesis recommendation never blocks dispatch.

Workers retain focused in-unit discovery. Broad, inaccessible, or depth-blocked gaps return through [Child contracts](child-contracts.md), preserving the accepted unit and authority. Supply its mutation stop contract. Apply the root skill's acceptance decision before dependent work; surface material design/behavior mismatches rather than silently reconciling them.

## Schedule and integrate

Serialize mutation by default and whenever overlap is unknown. Parallelize only demonstrably independent responsibilities and mutable state with material concurrency value. Different directories are insufficient: checkout/index, lockfiles, dependency installation, generated output, test caches, runtimes, schemas, and external systems can remain shared.

Use only authorized isolation. Defer shared integration, rendering, runtime probes, and repository-wide validation until isolated work is ready. A sequential fresh agent receives its predecessor's checked state and relevant handoff.

When combining results requires mutation or distinct shared validation, assign an authorized operator for procedural integration or worker for substantive software integration. Supply accepted inputs, exact state, conflict boundaries, acceptance, and final shared validation ownership. Keep final validation with the last mutation unit when coherent; omit a separate integration agent when there is no distinct integration outcome. The coordinator does not integrate by mutation.

## Preparation and publication handoffs

A preparation result identifies workspace/repository, branch and base commit, dirty/worktree state, external IDs, prepared tools, mutations, baseline validation, blockers, and the exact assumptions the build agent may use. Transfer those checked assumptions and the accepted build contract without mechanical setup history. For an artifact-author, include audience, destination, owning workflow, source fidelity, publication authority/state, and relevant synthesis.

One authorized coordinated operation may use one sequential operator across known repositories. Preserve each repository's instructions, validation, Git history, commit boundary, remote, and authority. When practical, validate all before publication. Authorized commits are separate Conventional Commits. Report commit/push results per repository; partial publication remains in place if a later operation fails, with no destructive rollback and a clear recovery action. Split operators only for genuine independence and worthwhile concurrency.

## External operations

Send narrow, understood, readily reversible operations directly to the authorized operator. Add evidence proportional to material uncertainty, impact, dependencies, selectors, access, or recovery; production scope alone does not create a fixed approval or investigation cycle.

Require these operational conditions in the brief:

1. Ground the exact target/effect, operation semantics, affected resources/dependencies, impact, recovery, and must-preserve invariants in current evidence. Resolve material uncertainty or return the smallest decision. Separate required outcome/safety probes from informational diagnostics; invented/nonessential assertions cannot trigger rollback.
2. Capture minimal safely available pre-change state needed to identify, verify, and restore mutable configuration. This is inherent read-only preflight. Session/tool evidence usually suffices; use a restoration file only when useful. Exclude secrets, unrelated sensitive data, volatile and non-reapplicable fields. Surface unavailable meaningful state and its recovery consequence before mutation.
3. Treat backups separately. Ask before an existing on-demand backup/snapshot/export unless already authorized, explaining material cost, time, retention, and effects. Do not build backup infrastructure or alter/invoke independently managed automated backups for compliance. Existence does not prove restorability; absence alone does not block responsible work.
4. Revalidate consequential assumptions immediately before the narrowest correct mutation. Stop with preserved state for material differences in target, state, impact, recovery, procedure, or authority. Read resulting state and verify the outcome/invariants afterward; report irreversible residual effects such as notifications, deletions, or downstream events.
5. For asynchronous or coordinator-disrupting operations, record current state and a durable readiness/terminal signal. Use narrow pending-state probes until that signal establishes readiness or completion, then release dependent acceptance. Launch is not completion and a pending probe does not consume the acceptance unit.
