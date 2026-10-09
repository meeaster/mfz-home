# Live investigation

## The ask

"Use the Datadog MCP server to find out which hosts are reporting VPN metrics and since when."

## What should happen

1. An inspector queries the live system through the Datadog MCP server, the AWS CLI, or the shell, as the question needs.
2. It returns what it observed, with the queries it ran and the time range, so the result can be checked again.
3. Independent questions about different systems go to separate inspectors in parallel.

## What must not happen

- The inspector changes anything in Datadog, AWS, or the repository.
- The orchestrator runs the queries itself.
- Credentials or secrets appear in the result.

## Done looks like

Facts about the live system, with enough of the query to repeat it.
