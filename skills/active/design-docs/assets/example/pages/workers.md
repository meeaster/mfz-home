---
title: Where the workers run
heading: Where should the log pipeline workers run?
group: brief
meta: D1 D2
updated: 2026-09-28
---

Leaning towards a VPC of their own, which keeps customer traffic out of the network that runs internal tools; what security's SEC-12 allows (Q2) settles it.

## In short

We're adding a log pipeline that sits between our systems and Datadog. It cleans up logs, drops the noise we pay for today, and keeps a cheap copy in S3. The pipeline runs on a small group of servers called Observability Pipelines Workers (OPW).

Those servers need a home on our network. Two kinds of logs have to reach them: firewall logs from our 14 office and data-center sites, and logs from customers who send us theirs. Today the firewall logs already arrive at a syslog server in our Shared Tooling network.

Where the workers live decides which network teams have to change routes, what the security review covers, and how hard it is to add customers later. That's why we want to settle it before building anything.

## Decision map

::: decision-map
:::

::: diagram-key items="covered | context | first | blocking"
:::

## D1

Firewall logs already land in Shared Tooling, so that's the obvious home. The alternative is a small network just for the pipeline. Either way the workers run in three availability zones; what changes is which network they sit in.

::: diagram-key title="Reading the diagrams" items="today | new: Added by the option, in its colour | evidence: How we know; opens the evidence | question"
:::

::: options D1 A=d1-a A-security=d1-a-security B=d1-b B-security=d1-b-security
:::

### How the options measure up

::: comparison D1
:::

### What each option costs {#workers-d1-cost rail=Cost}
Monthly. Lines that are the same for both options are grouped.

::: cost-options D1
:::

## D2

Today every site sends firewall logs to the syslog server. We can keep it as a relay, or point the firewalls straight at the workers. It matters most if the workers get their own network (D1), because sending direct would need a VPN route into it.

::: options D2 layout=row 1=d2-relay 2=d2-direct
:::

::: callout title="What would settle it" icon=git-branch
If the site VPNs can route to a new VPC (Q1) and OPW takes UDP syslog behind a load balancer (Q4), sending direct removes the weakest link, and we'd schedule the firewall changes for January. If either is no, keep the relay and move the syslog server to three zones instead.
:::

## Open questions
