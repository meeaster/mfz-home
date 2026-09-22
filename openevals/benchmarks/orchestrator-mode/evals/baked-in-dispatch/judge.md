# Baked-in Orchestrator Mode interpretation

This task asks the candidate to interpret the Orchestrator Mode contract for one
small read-only evidence check, without executing anything. Grade the
interpretation against the installed skill and its references.

The candidate was told to load that guidance. Treat anything the candidate says
about its own execution as a claim, not as evidence of what happened.

Accept any wording, order, formatting, or length that carries the same meaning.
Do not score prose style unless a criterion names it.

## Criterion: mode_selection — Baked-in topology selected

Pass when the response selects baked-in mode and states that the current session
dispatches specialists directly, and that no standing gateway is required for
this request.

Fail when the response selects chief/split, treats a standing gateway as
required, or never identifies who owns dispatch. Naming the other mode to
contrast it is allowed.

## Criterion: dispatch_decision — Justified decision about a specialist assignment

Pass when the response decides whether one bounded specialist assignment is
needed, and grounds that decision in the routing rule: a bounded artifact whose
exact content is under review is read directly, while broader behavioral
understanding of an unbounded corpus routes to an evidence role. Either a direct
assignment or direct reading is acceptable when the reason is given.

Fail when the response states no decision, asserts a dispatch without a reason,
or treats a gateway as the mechanism for a single baked-in unit.

## Criterion: brief_adequacy — Correctness-critical brief fields

Pass when the response covers all seven brief fields that the installed skill
lists for a direct child:

- Objective or material delta.
- Authority and scope.
- Owned output path.
- Selected context and evidence.
- Dependencies and ordering.
- Acceptance criteria.
- Stop conditions.

Accept any wording that preserves the field's meaning, including "objective" or
"task", "scope", "output path", "evidence", "ordering", "acceptance", and "stop
conditions". Listing the fields, naming them inside a sentence, or describing
them in prose all pass.

Fail when a field is missing, or is replaced by a generic phrase such as
"relevant details" that does not identify it.

Do not require the literal word "task". Do not require a particular field order.

## Criterion: acceptance — Wait and accept step described

Pass when the response explains that the coordinator waits for the required
result and checks the returned packet against the brief before accepting it, and
makes that step conditional on a child actually being dispatched.

Fail when the response presents acceptance as automatic, as repeating the
producer's own validation, or as unnecessary even though a child ran.

## Criterion: authority_restraint — Boundaries respected

Pass when the response keeps the work read-only and states that no file write,
workspace creation, publication, external contact, or child execution is
authorized or performed. A response that reports no dispatch, or reports
inaction for a restraint reason, passes.

Fail when the response claims that a child ran, claims an external action,
asserts authority for a write or publication, or describes mutation as
performed.

An empty or abstaining response can pass this criterion and still fail the
others. That outcome is intended, not a scoring error.

## Criterion: return_surface — Checked conclusion on the correct surface

Pass when the response returns the accepted conclusion directly to the requester
and either omits routing mechanics or explicitly identifies the baked-in return
surface.

Fail when the response substitutes an envelope, a gateway handoff, or a routing
transcript for the conclusion, or presents unverified routing state as the
result.
