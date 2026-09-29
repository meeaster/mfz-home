<!-- design-docs format 2 -->
# Log ingestion in our cloud

How firewall and customer logs are collected, filtered and kept in GovCloud.

## Terms

- **OPW** [overview, pipeline-workers, workers]: Observability Pipelines Workers. Datadog's log pipeline software, run on our own servers.
- **VPC** [overview, pipeline-workers, workers]: A private network in AWS. Each one has its own address range and rules.
- **Shared Tooling VPC** [overview, firewall-intake, workers]: The existing network that hosts common tools, including the syslog server.
- **ASA** [firewall-intake, workers]: Cisco ASA, the firewalls at each site. They send logs using syslog.
- **Syslog server** [firewall-intake, workers]: Collects firewall logs today and forwards them on.
- **Transit Gateway** [overview, firewall-intake, workers]: The AWS hub that connects our VPCs and the site VPNs to each other.
- **PrivateLink** [overview, customer-intake]: A private connection into one AWS service, with no routes into the rest of the network.
- **Area** [overview]: One part of the design with its own page: its requirements, decisions, questions and risks.
- **Prefix** [s3-archive]: The start of an object's name in S3, such as customer=acme/. Access rules can be written per prefix.
- **KMS key** [s3-archive]: An encryption key held in AWS KMS. Reading an object needs permission on its key as well as on the bucket.
- **Bucket policy** [s3-archive]: The access rules attached to a bucket. Its size limit caps how many per-customer rules fit.
- **Lifecycle rule** [s3-archive]: An S3 rule that deletes objects once they reach a set age.

## Requirements

### R1 · Receive syslog from the firewalls at all 14 sites.
- Short: Firewall logs from all sites
- Priority: Must
- Why: Firewall logs are the main signal in security investigations.
- Source: Security team
- Page: firewall-intake
- Met: Yes · Relayed by the syslog server over the Transit Gateway. [E1, D2]

### R2 · Receive logs from customer networks over a private connection.
- Short: Customer logs over a private connection
- Priority: Must
- Why: The first three customers start in November, and their contracts rule out the public internet.
- Source: Customer onboarding effort
- Page: customer-intake
- Met: Yes · A PrivateLink endpoint in the workers' VPC. [E6, D3]

### R3 · Expose no log intake to the public internet.
- Short: No public log intake
- Priority: Must
- Why: The security baseline for any new service.
- Source: Security standard SEC-12
- Applies to: customer-intake
- Met: Yes · PrivateLink only; nothing listens on a public address. [E6]

### R4 · Keep running if one AWS availability zone fails.
- Short: Survives losing one zone
- Priority: Must
- Why: Incidents are when we need logs most.
- Source: Platform standards
- Applies to: firewall-intake, pipeline-workers
- Met: Partly · Workers span three zones, but the syslog server is one instance in one zone. [E4, E5, D2]
- Met on firewall-intake: Partly · The syslog server is one instance in one zone. [E5, D2]
- Met on pipeline-workers: Yes · One worker per zone; two carry peak load. [E4, D4]

### R5 · Add no new site VPN tunnels before January.
- Short: No new VPN tunnels before January
- Priority: Should
- Why: The network team's change calendar is full for \Q4.
- Source: Network team
- Page: firewall-intake
- Met: Yes · The relay keeps firewall traffic on the existing site VPNs. [E1, D2]

### R6 · Keep log data inside the GovCloud partition, unless the destination is authorized to hold it.
- Short: Logs stay in the GovCloud partition
- Priority: Must
- Why: Firewall and customer logs include controlled unclassified information (CUI).
- Source: Compliance: GovCloud boundary
- Applies to: pipeline-workers, s3-archive
- Met: Partly · The archive stays inside. Datadog's government site still needs confirming. [Q6]
- Met on pipeline-workers: Partly · Filtered logs go to Datadog, whose government site still needs confirming. [Q6]
- Met on s3-archive: Yes · Both buckets and all keys are in us-gov-west-1. [E9]

### R7 · Use FIPS-validated encryption for data in transit and at rest.
- Short: FIPS-validated encryption
- Priority: Must
- Why: Required for every system inside the authorization boundary.
- Source: Compliance: FIPS 140
- Applies to: firewall-intake, s3-archive
- Met: No · Syslog from the relay to the workers is unencrypted today. TLS on the relay fixes it. [E5, D2]
- Met on firewall-intake: No · Syslog from the relay to the workers is unencrypted, and the tunnel ciphers aren't confirmed. [E5, Q7]
- Met on s3-archive: Yes · Writes and reads use the S3 FIPS endpoint; objects are encrypted with KMS. [E9]

### R8 · A customer's logs can be read only with that customer's role and key.
- Short: Only that customer can read their logs
- Page: s3-archive
- Priority: Must
- Why: Contracts promise each customer that nobody else can see their logs.
- Source: Customer contracts
- Met: Partly · A role and key per customer. Depends on OPW writing each customer's prefix with their own key. [Q10, D6]

### R9 · Keep every log for one year, then delete it.
- Short: Kept one year, then deleted
- Page: s3-archive
- Priority: Must
- Why: Security's retention rule; keeping logs longer adds risk without a use.
- Source: Security team
- Met: Yes · A lifecycle rule on both buckets deletes objects at 365 days. [D5]

### R10 · Give a customer all their logs for a date range within one working day.
- Short: A customer's logs within a day
- Page: s3-archive
- Priority: Should
- Why: Customers ask for their logs during their own investigations.
- Source: Customer onboarding effort
- Met: Yes · Their prefix is copied out with their export role; no other customer's data is touched. [E8]

## Parts

### ASA firewalls
- Page: firewall-intake
- Does: Send firewall logs from 14 sites over the site VPNs. Unchanged.
- Decided by: Exists today
- Evidence: E1

### Syslog server
- Page: firewall-intake
- Does: Collects firewall logs in Shared Tooling and relays them to the workers over the Transit Gateway.
- Decided by: D2
- Evidence: E1, E5

### Observability VPC
- Page: pipeline-workers
- Does: A new VPC that holds the workers and the customer endpoint, joined to the Transit Gateway.
- Decided by: D1
- Evidence: E2, E3

### OPW workers
- Page: pipeline-workers
- Does: Filter and route every log. Three workers, one per zone, so one zone can fail.
- Decided by: D0, D4, D7
- Evidence: E4

### Customer endpoint
- Page: customer-intake
- Does: A PrivateLink endpoint service that customers connect to without routes into our network.
- Decided by: D3
- Evidence: E6, Q3

### Datadog
- Page: pipeline-workers
- Does: Receives filtered logs for search, dashboards and alerts.
- Decided by: D0
- Evidence: Q6

### opw-archive-internal
- Page: s3-archive
- Does: Firewall and our own logs, by site and date. Encrypted with the internal key.
- Decided by: D5
- Evidence: E7

### opw-archive-customers
- Page: s3-archive
- Does: Customer logs, one prefix per customer, each prefix written with that customer's key.
- Decided by: D5, D6
- Evidence: E8, Q10

### KMS keys
- Page: s3-archive
- Does: One for our logs and one per customer. A customer's export role can use only their key.
- Decided by: D6
- Evidence: E9, Q10

### Security read role
- Page: s3-archive
- Does: Lets the security team read the internal bucket during investigations.
- Decided by: Standard access pattern
- Evidence: E9

### Customer export roles
- Page: s3-archive
- Does: One per customer. Reads only that customer's prefix, with that customer's key.
- Decided by: D6
- Evidence: E8

## Decisions

### D1 · Where do the workers run?
- Rail: Where the workers run
- Shapes: Shapes the Observability VPC and the Transit Gateway routes.
- Applies to: firewall-intake, customer-intake, pipeline-workers
- Follows: D0
- Status: Leaning B
- Leaning: Their own VPC in GovCloud.
- Why: It keeps customer traffic out of the network that runs internal tools, which security may not allow there (Q2).
- Reasoning:
  - Shared Tooling has 212 free addresses (E3). The workers and the endpoint need about 40 now, and more as customers join.
  - It costs about $60 a month more than A, mostly Transit Gateway fees (E2).
  - Pipeline changes skip Shared Tooling's change approvals.
  - Sending firewall logs straight to the workers later needs a VPN route to the new range (Q1).
- Revisit if: Security allows customer traffic to end in Shared Tooling (Q2), and it has room for the endpoint.
- Note: Waiting on the VPN route and the network owner.
- Waiting on: Q1, Q2, Q5, Q6
- Worked out in: workers

The brief compares A and B in full; C was set aside at the Sep 22 session.

#### A · Put the workers in Shared Tooling
- Short: Shared Tooling
- Summary: Run them next to the syslog server, in the network that already receives firewall logs.
- Works well:
  - No routing changes for firewall logs; they already arrive here.
  - Nothing new to own. Shared Tooling already has patching, monitoring and backups.
  - No traffic crosses between networks, so no transfer fees.
- Costs and risks:
  - Customer traffic would end in the network that runs our internal tools. Security may not allow it (Q2).
  - 212 free addresses left. Workers and the endpoint need about 40 now, more as customers grow.
  - A pipeline problem shares a blast radius with CI runners and the VPN hub.
- Evidence:
  - E1: Firewall logs already reach this network over the site VPNs.
  - E3: 212 free addresses across three zones.
  - E4: Three workers cover peak load with one zone down.
- Meets R1: Yes · Already arrive here.
- Meets R2: Partly · Only if security allows customer traffic in Shared Tooling (Q2).
- Meets R3: Yes · PrivateLink only.
- Meets R4: Yes · Workers in three zones. The syslog server is still one zone (see D2).
- Meets R5: Yes · No VPN changes.
- Meets R6: Partly · Only if Datadog's site is authorized (Q6).
- Meets R7: No · Syslog between the relay and workers is unencrypted today.

#### B · Give the pipeline its own network
- Short: Own network
- Summary: A small new VPC for the workers and the customer endpoint, joined to Shared Tooling through the Transit Gateway.
- Status: Current leaning
- Works well:
  - Customer traffic stays out of the network that runs internal tools.
  - Room to grow: the new range holds about 4,000 addresses.
  - Pipeline changes skip Shared Tooling's change approvals.
- Costs and risks:
  - About $60 a month more than A, mostly Transit Gateway fees (see [Cost](#workers-d1-cost)).
  - Someone has to own a new network (Q5).
  - Sending firewall logs straight to the workers later needs a VPN route to the new range (Q1).
- Evidence:
  - E2: Transit Gateway fees for current firewall volume.
  - E6: A PrivateLink endpoint can live in any VPC.
  - E4: Three workers cover peak load with one zone down.
- Meets R1: Yes · Relayed by the syslog server over the Transit Gateway.
- Meets R2: Yes · Endpoint sits in its own network.
- Meets R3: Yes · PrivateLink only.
- Meets R4: Yes · Same as A.
- Meets R5: Yes · No VPN changes while the relay stays (D2).
- Meets R6: Partly · Only if Datadog's site is authorized (Q6). S3 archive stays inside.
- Meets R7: No · Same, and it now crosses VPCs. Add TLS to the relay (see security view).

#### C · Workers in every workload VPC
- Status: Set aside Sep 22
- Why not: Five worker groups to run and patch, and customer traffic would still need a single home, so it doesn't answer the question.

### D2 · How do firewall logs reach the workers?
- Rail: How firewall logs get there
- Shapes: The syslog relay, or straight from the firewalls.
- Page: firewall-intake
- Applies to: pipeline-workers
- Follows: D1
- Status: Open
- For now: Relay through the syslog server.
- Note: Sending direct needs new VPN routes.
- Waiting on: Q1, Q4
- Worked out in: workers-d2

#### 1 · Keep the syslog server as a relay
- Summary: Firewalls keep sending where they do today; the syslog server forwards to the workers.
- Works well:
  - No changes on the firewalls at 14 sites.
  - Works with either D1 option as it stands.
- Costs and risks:
  - The syslog server runs in one zone and dropped messages twice this year (E5).
  - One more server to patch and watch.
- Evidence: E5

#### 2 · Send straight to the workers
- Summary: Point each firewall at a load balancer in front of the workers and retire the relay.
- Works well:
  - Removes the single-zone weak spot.
  - One fewer server in the path.
- Costs and risks:
  - 14 firewall changes, coordinated with each site.
  - With B, the site VPNs need a route to the new range (Q1).
  - Unproven: OPW taking UDP syslog behind a load balancer (Q4).
- Evidence: Q4

### D3 · How do customers connect?
- Rail: How customers connect
- Shapes: How customers reach the workers, and what they connect to.
- Page: customer-intake
- Follows: D1
- Status: Later
- Assuming: A PrivateLink endpoint in the workers' VPC.
- Waiting on: D1, Q3
- Worked out in: No brief yet

### D6 · How is customer data kept apart in S3?
- Rail: How customer data is kept apart
- Shapes: A bucket per customer, or a prefix and key per customer.
- Page: s3-archive
- Status: Open
- Leaning: A prefix and KMS key per customer in one bucket.
- Note: Depends on how many customers we expect.
- Waiting on: Q8, Q10
- Evidence: E8
- Worked out in: s3-archive

### D7 · What does OPW drop before Datadog?
- Rail: What OPW drops
- Shapes: Everything is still archived.
- Page: pipeline-workers
- Status: Open
- So far: Nothing proposed yet. Security wants a list before anything is dropped.
- Waiting on: Q9
- Worked out in: Not started

### D0 · What runs the log pipeline?
- Shapes: Every area
- Status: Decided
- Answer: Datadog Observability Pipelines Workers, on our own servers.
- Why: Datadog already holds our dashboards and alerts, and workers on our own servers drop the noise before Datadog bills for it.
- Also considered:
  - Send straight to Datadog from each source: nothing drops the noise we pay for, and there's no single copy to archive.
  - Vector, run by us: the same filtering, but we'd support the pipeline ourselves.
- Worked out in: meeting-2026-08-14

### D4 · How many workers, and what size?
- Page: pipeline-workers
- Status: Decided
- Answer: Three c7g.large, one per zone.
- Why: Three workers cover peak load even with one zone down (E4), which R4 requires.
- Reasoning:
  - Peak is 18,000 events a second. At 2 vCPU per 10,000 events, two c7g.large carry it alone (E4).
  - One worker per zone keeps the pipeline running through a zone outage.
- Revisit if: Peak passes 20,000 events a second, when two workers no longer carry it.
- Also considered:
  - Two c7g.xlarge: the same capacity, but a zone outage takes half of it away.
  - An autoscaling group: load is steady through the day, so scaling adds parts to run for little gain.
- Evidence: E4
- Worked out in: meeting-2026-09-22

### D5 · How long does the archive keep logs?
- Rail: How long the archive keeps logs
- Page: s3-archive
- Status: Decided
- Answer: One year in S3, then deleted.
- Why: It's the security team's retention rule (R9), and keeping logs longer adds risk without a use.
- Evidence: E7
- Worked out in: meeting-2026-09-22

## Risks

### The syslog relay fails or restarts.
- Likelihood: Medium
- If it happens: Firewall logs stop until it's back; messages sent meanwhile are lost.
- What we'd do: Run a second relay behind the load balancer, or send direct once D2 allows it.
- Linked: E5, D2
- Page: firewall-intake

### Customer volume is much larger than forecast.
- Likelihood: Medium
- If it happens: Workers fall behind and customer logs reach Datadog late.
- What we'd do: Size the worker group for twice today's peak and alert on buffer depth.
- Linked: E4, Q3
- Page: pipeline-workers
- Applies to: customer-intake

### Datadog's government site isn't authorized for CUI.
- Likelihood: Unknown
- If it happens: R6 fails, and logs can't leave the partition for Datadog.
- What we'd do: Keep the S3 archive as the record and hold customer onboarding until it's confirmed.
- Linked: Q6
- Applies to: pipeline-workers

### Nobody owns the new VPC.
- Likelihood: Medium
- If it happens: Route and security group changes stall between teams.
- What we'd do: Name an owner before the VPC is built.
- Linked: Q5, D1
- Applies to: firewall-intake, pipeline-workers

## Costs

### Load balancer for the workers
- Page: firewall-intake
- Drives: Spreads firewall logs across the three workers.
- Monthly: $26
- Evidence: E7

### Transit Gateway data processing
- Page: firewall-intake
- Drives: 1.2 TB of firewall logs a month crossing from the relay into the pipeline's VPC.
- Monthly: A $0 · B $24
- Varies with: D1
- Affected by: D2
- Evidence: E2

### Cross-zone transfer
- Page: firewall-intake
- Drives: The syslog server is in one zone; two thirds of its traffic crosses to other zones.
- Monthly: $16
- Affected by: D2
- Evidence: E7

### Customer endpoint
- Page: customer-intake
- Drives: Load balancer behind the PrivateLink endpoint service.
- Monthly: $22
- Affected by: D3
- Evidence: E7

### Workers
- Page: pipeline-workers
- Drives: 3 × c7g.large, one per availability zone.
- Monthly: $159
- Affected by: D4
- Evidence: E4

### Transit Gateway attachment
- Page: pipeline-workers
- Drives: Joining a VPC of the pipeline's own to the Transit Gateway, billed by the hour.
- Monthly: A $0 · B $36
- Varies with: D1
- Evidence: E7

### Archive storage
- Page: s3-archive
- Drives: About 120 GB of compressed logs a month, kept for a year. Grows until the first year is full.
- Monthly: $3 → $39
- Affected by: D5
- Evidence: E7

## Flows

### S-F1 · ASA firewalls → Syslog server
- Path: over site VPNs
- Data: Firewall logs · CUI
- In transit: Syslog over UDP inside IPsec tunnels. Tunnel ciphers not yet confirmed as FIPS-validated.
- Auth: Source IP allowlist
- Crosses: Yes · Partition boundary
- Assessment: Partly · Confirm FIPS ciphers [Q7]

### S-F2 · Syslog server → OPW workers
- Path: through the Transit Gateway
- Data: Firewall logs · CUI
- In transit: Syslog over TCP with no TLS. Leaves one VPC for another.
- Auth: Security group
- Crosses: No · VPC boundary
- Assessment: No · Add TLS on the relay before go-live [D2]

### S-F3 · Customers → Endpoint → workers
- Path: PrivateLink
- Data: Customer logs · CUI
- In transit: TLS 1.2 over PrivateLink. No routes into our network.
- Auth: Per-customer API key
- Crosses: Yes · Account and partition boundary
- Assessment: Yes · Private and encrypted [E6]

### S-F4 · OPW workers → S3 archive
- Path: gateway endpoint
- Data: All logs · CUI
- In transit: TLS to the S3 FIPS endpoint.
- Auth: IAM role
- Crosses: No · Leaves the VPC, stays in the partition
- Assessment: Yes · Meets R6 and R7 [E9]

### S-F5 · OPW workers → Datadog
- Path: internet, HTTPS
- Data: Filtered logs · CUI
- In transit: HTTPS with TLS 1.2 to Datadog's intake.
- Auth: API key
- Crosses: Yes · Partition boundary
- Assessment: Partly · Only if the government site is authorized [Q6]

### A-F1 · ASA firewalls → Syslog server
- Path: over site VPNs
- Data: Firewall logs · CUI
- In transit: Syslog over UDP inside IPsec tunnels. Tunnel ciphers not yet confirmed as FIPS-validated.
- Auth: Source IP allowlist
- Crosses: Yes · Partition boundary
- Assessment: Partly · Confirm FIPS ciphers [Q7]

### A-F2 · Syslog server → OPW workers
- Path: inside Shared Tooling
- Data: Firewall logs · CUI
- In transit: Syslog over TCP with no TLS, within one VPC.
- Auth: Security group
- Crosses: No · None
- Assessment: No · Add TLS on the relay before go-live

### A-F3 · Customers → Endpoint → workers
- Path: PrivateLink
- Data: Customer logs · CUI
- In transit: TLS 1.2 over PrivateLink. Customer traffic ends in the network that runs internal tools.
- Auth: Per-customer API key
- Crosses: Yes · Account and partition boundary
- Assessment: Partly · Only if security allows it here [Q2]

### A-F4 · OPW workers → S3 archive
- Path: gateway endpoint
- Data: All logs · CUI
- In transit: TLS to the S3 FIPS endpoint.
- Auth: IAM role
- Crosses: No · Leaves the VPC, stays in the partition
- Assessment: Yes · Meets R6 and R7

### A-F5 · OPW workers → Datadog
- Path: internet, HTTPS
- Data: Filtered logs · CUI
- In transit: HTTPS with TLS 1.2 to Datadog's intake.
- Auth: API key
- Crosses: Yes · Partition boundary
- Assessment: Partly · Only if the government site is authorized [Q6]

### B-F1 · ASA firewalls → Syslog server
- Path: over site VPNs
- Data: Firewall logs · CUI
- In transit: Syslog over UDP inside IPsec tunnels. Tunnel ciphers not yet confirmed as FIPS-validated.
- Auth: Source IP allowlist
- Crosses: Yes · Partition boundary
- Assessment: Partly · Confirm FIPS ciphers [Q7]

### B-F2 · Syslog server → OPW workers
- Path: through the Transit Gateway
- Data: Firewall logs · CUI
- In transit: Syslog over TCP with no TLS. Leaves one VPC for another.
- Auth: Security group
- Crosses: No · VPC boundary
- Assessment: No · Add TLS on the relay before go-live

### B-F3 · Customers → Endpoint → workers
- Path: PrivateLink
- Data: Customer logs · CUI
- In transit: TLS 1.2 over PrivateLink. No routes into our network.
- Auth: Per-customer API key
- Crosses: Yes · Account and partition boundary
- Assessment: Yes · Private and encrypted [E6]

### B-F4 · OPW workers → S3 archive
- Path: gateway endpoint
- Data: All logs · CUI
- In transit: TLS to the S3 FIPS endpoint.
- Auth: IAM role
- Crosses: No · Leaves the VPC, stays in the partition
- Assessment: Yes · Meets R6 and R7

### B-F5 · OPW workers → Datadog
- Path: internet, HTTPS
- Data: Filtered logs · CUI
- In transit: HTTPS with TLS 1.2 to Datadog's intake.
- Auth: API key
- Crosses: Yes · Partition boundary
- Assessment: Partly · Only if the government site is authorized [Q6]

## Questions

### Q1 · Can the site VPNs carry a route to a new VPC's address range without re-creating the tunnels?
- Short: Can site VPNs reach a new VPC?
- Who: Network team (other team)
- Blocks: D1, D2

### Q2 · Does security standard SEC-12 allow customer traffic to end inside Shared Tooling?
- Short: May customer traffic end in Shared Tooling?
- Who: Security (GRC) (other team)
- Blocks: D1

### Q3 · How much log volume will the first three customers send in their first 90 days?
- Short: Customer log volume?
- Who: Customer onboarding lead (other team)
- Blocks: D3

### Q4 · Can OPW receive UDP syslog behind a Network Load Balancer without dropping messages?
- Short: Syslog behind a load balancer?
- Who: Datadog support (vendor)
- Blocks: D2

### Q5 · If we create a new VPC, which team owns it: patching, alerts, and cost?
- Short: Who owns a new VPC?
- Who: Platform team (our team)
- Blocks: D1

### Q6 · Is our Datadog organization on Datadog's government site, and is that site authorized for this data?
- Short: Is Datadog's government site authorized?
- Who: Security (GRC) (other team)
- Blocks: D1, R6

### Q7 · Do the site VPN tunnels use FIPS-validated encryption today?
- Who: Network team (other team)
- Blocks: R7

### Q8 · How many customers do we expect to onboard in the first year?
- Who: Customer onboarding lead (other team)
- Blocks: D6

### Q9 · Which kinds of log may OPW drop before Datadog, and which must always reach it?
- Who: Security (GRC) (other team)
- Blocks: D7

### Q10 · Can OPW's S3 destination write each customer's logs with a different KMS key?
- Who: Datadog support (vendor)
- Blocks: D6, R8

### Q11 · Which address ranges do the site VPNs carry today?
- Who: Network team (other team)
- Blocks: D2
- Answer: Only 10.40.0.0/16.
- Answered by: E1

### Q12 · How much firewall log data do the 14 sites send?
- Who: Me (me)
- Blocks: D2
- Answer: About 1.2 TB a month.
- Answered by: E2

### Q13 · How many workers does peak load need?
- Who: Platform team (our team)
- Blocks: D4
- Answer: Three c7g.large, even with one zone down.
- Answered by: E4

## Evidence

### E1 · Firewall logs from all 14 sites reach the syslog server over site VPNs that end on the Transit Gateway. The VPNs only carry routes for 10.40.0.0/16.
- Found: Sep 24
- How we know: Read the Transit Gateway route tables in the network account and matched them against the VPN module in the network Terraform. Both show the site VPNs advertising only 10.40.0.0/16. The network team confirmed it's current.
- Gathered from:
  - AWS account: prod-network · Transit Gateway route tables
  - Infrastructure as code: infra-network repo · VPN module
  - Confirmed with: Network team, Sep 24

### E2 · Firewall logs average 1.2 TB a month. Transit Gateway charges $0.02 per GB it processes, about $24 a month at this volume.
- Found: Sep 25
- How we know: Datadog's usage page for the last 90 days, priced with AWS's published Transit Gateway rates.
- Gathered from:
  - Datadog: Log usage, last 90 days
  - AWS pricing: Transit Gateway, GovCloud (US-West)

### E3 · Shared Tooling's private subnets have 212 free addresses across three zones.
- Found: Sep 24
- How we know: Listed the Shared Tooling subnets in the tooling account and added up their available addresses.
- Gathered from:
  - AWS account: shared-tooling · VPC subnets

### E4 · Datadog sizes workers at 2 vCPU per 10,000 events a second. Our peak is 18,000, so three workers still cover it with one zone down.
- Found: Sep 23
- How we know: Datadog's sizing guidance for Observability Pipelines Workers, applied to our busiest hour over the last 30 days.
- Gathered from:
  - Vendor documentation: Datadog OPW sizing guide
  - Datadog: Log volume, peak hour, last 30 days

### E5 · The syslog server is one instance in one zone. It dropped messages during restarts twice this year.
- Found: Sep 26
- How we know: The instance's placement in the tooling account, and two incident reviews that traced missing firewall logs to syslog restarts.
- Gathered from:
  - AWS account: shared-tooling · syslog instance
  - Incident reviews: INC-2291, INC-2340

### E6 · A PrivateLink endpoint service can sit in any VPC; customers connect to it without routes into our network.
- Found: Sep 23
- How we know: AWS's PrivateLink documentation for endpoint services.
- Gathered from:
  - Vendor documentation: AWS PrivateLink, endpoint services

### E7 · At us-gov-west-1 list prices, a Transit Gateway attachment is about $36 a month, a Network Load Balancer about $16 plus usage, a c7g.large about $53, and S3 Standard storage about $0.027 per GB.
- Found: Sep 27
- How we know: AWS's published on-demand prices for GovCloud (US-West).
- Gathered from:
  - AWS pricing: GovCloud: EC2, Elastic Load Balancing, Transit Gateway, S3

### E8 · An S3 bucket policy can be at most 20 KB. In the format our other buckets use, that fits about 60 per-customer statements.
- Found: Sep 27
- How we know: The bucket policy size limit in AWS's S3 documentation, and the size of one per-customer statement in the policy used by the existing export bucket.
- Gathered from:
  - Vendor documentation: Amazon S3 bucket policies, limits
  - AWS account: shared-tooling · export bucket policy

### E9 · S3 has FIPS endpoints in GovCloud (US-West), and AWS KMS keys there are held in FIPS 140-validated hardware security modules.
- Found: Sep 27
- How we know: AWS's FIPS endpoint list for GovCloud and the AWS KMS documentation on its hardware security modules.
- Gathered from:
  - Vendor documentation: AWS GovCloud (US) FIPS endpoints
  - Vendor documentation: AWS KMS, cryptographic details

## Meetings

### 2026-09-22 · Network working session
- Status: Summarised
- Who: Me · Network team (2) · Security (1)
- Summary:
  - The network team walked through how firewall logs reach Shared Tooling today. Their route tables became E1.
  - We agreed that a worker group in every workload VPC (option C in the brief) is too much to run for what it buys.
  - Settled worker sizing: three c7g.large, one per zone, which covers peak load with a zone down (D4).
  - Security set one year as the archive's retention (D5), and asked whether customer traffic may end inside Shared Tooling. Nobody knew; it became Q2.
  - Nobody could say whether the site VPNs can carry a route to a new network without re-creating tunnels (Q1).

### 2026-08-14 · Platform sync
- Status: Summarised
- Who: Platform team · Security (GRC)
- Summary:
  - Chose Datadog Observability Pipelines Workers, run on our own servers, as the log pipeline (D0).
  - Agreed to write the design up as this doc before building anything.
