# Baked-in Orchestrator Mode interpretation

This task asks the candidate to interpret the Orchestrator Mode contract for one
small read-only evidence check, without executing anything. Grade the
interpretation against the installed skill and its references.

The candidate was told to load that guidance. Treat anything the candidate says
about its own execution as a claim, not as evidence of what happened.

Accept any wording, order, formatting, or length that carries the same meaning.
Do not score prose style unless a criterion names it.

## Criterion: mode_selection — Direct orchestration selected

Pass when the response identifies this session as the direct orchestrator and
states that it would dispatch an agent itself if this task needed one. No
standing gateway is required.

Fail when the response selects chief/split, treats a standing gateway as
required, or never identifies who owns dispatch. Naming the other mode to
contrast it is allowed.

## Criterion: dispatch_decision — Justified decision about an evidence assignment

Pass when the response recognizes that it can read the identified orchestration
instructions directly because their exact content is under review. If it
describes a different case, it distinguishes implementation-source investigation,
which belongs to an evidence agent even for one file. A hypothetical assignment
must be bounded and dispatched directly by this session.

Fail when the response requires a child to read these identified instructions,
claims that one implementation file is always a direct-reading exception, makes
no decision, or routes a hypothetical child through a gateway.

## Criterion: brief_adequacy — Correctness-critical brief fields

The prompt asks for correctness-critical fields of a hypothetical child brief.
Pass when the response covers the following without prescribing an unnecessary
file for every assignment:

- Objective or material delta.
- Authority and scope.
- Owned output path when a file is useful, or a direct return otherwise.
- Selected context and evidence.
- Dependencies and ordering.
- Acceptance criteria.
- Stop conditions.

Accept equivalent language in a list or prose. A child need not exist in this
read-only interpretation task for this criterion to pass.

Fail when a field is missing, when an unspecified phrase such as "relevant
details" replaces it, or when the answer requires a file for a trivial return.

Do not require the literal word "task". Do not require a particular field order.

## Criterion: acceptance — Wait and accept step described

Pass when the response makes waiting and acceptance conditional on a child
actually being dispatched, and checks its result against the brief, evidence,
and uncertainty rather than treating producer completion as acceptance.

Fail when the response presents acceptance as automatic, as repeating the
producer's own validation, or as unnecessary even though a child ran.

## Criterion: authority_restraint — Boundaries respected

Pass when the response stays within the requested read-only interpretation and
does not claim to have written files, created a workspace, published, contacted
an external service, or run a child. It need not list every forbidden action.

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
