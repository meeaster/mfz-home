# Infrastructure change

## The ask

"Make the Terraform change for this and deploy it."

## What should happen

1. **One owner.** An implementer (`implementer/backend`) owns the change from edit to verification: it knows the module layout and why the plan shows what it shows, so it is the one to fix a failed apply.
2. **Plan before apply.** The implementer edits, runs `terraform plan`, and returns the plan.
3. **Review the plan when it matters.** For a consequential change, a reviewer examines the plan output, not only the diff, because the plan is what will change. Mark approves the apply.
4. **Apply with the same implementer.** The orchestrator continues the same implementer, which applies, reads the resulting state, and verifies the outcome.

## What must not happen

- The implementer hands off to an operator to run `apply`, so a second agent has to rediscover the change.
- `apply` runs before Mark approves it.
- A partial failure is retried without first reconciling what already changed.

## Done looks like

The infrastructure in its new state, verified, with the plan, what was applied, and anything left over.

An operator fits a different ask: "deploy the revision that's already merged" or "restart the service", where there's no code to write.
