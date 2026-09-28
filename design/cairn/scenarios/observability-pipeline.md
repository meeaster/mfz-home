# An observability pipeline that grows across efforts

## The human's situation

The human wants to archive logs in Amazon S3. What starts as a question about the AWS account structure grows into work involving a Datadog Observability Pipelines Worker, Cisco ASA firewall logs, customer-device logs, security approval, and coordination with another infrastructure team.

The human does this work across many agent sessions over weeks. Some sessions investigate a question. Others develop a design, prepare an approval page, process a meeting, implement a change, or review a pull request. The human cannot know the final organization of the work at the start.

They want to return later and understand the work as a whole: what exists, what was decided, why the direction changed, what is blocked, and what to do next. A collection of code changes or a list of completed tasks would leave out much of that understanding.

This scenario follows the human's account of how the work expands. The meeting dialogue, specific subnet proposal, example task assignments, and subsequent walkthrough are illustrative details used to make the needs concrete. They do not establish that those particular meetings, approvals, or deployments occurred.

## People and places involved

The human works with agents to research, reason, write, implement, and review. A security lead reviews exposure and access permissions. A manager needs progress visible in Jira. An infrastructure engineer from another team advises on networking and has a separate shared VPC redesign to consider.

Material is spread across AWS and Datadog configuration, Confluence approval pages, Jira tickets, GitHub pull requests, email, meeting recordings, and agent conversations. The human needs these materials connected to the work they explain, even though their authoritative sources remain in different systems.

This is Work material. Its storage must respect that boundary rather than mixing it into the human's Personal work merely because the same workflow software serves both.

## How the work unfolds

### 1. Start with a question, before the scope is known

The opening question is, in substance: "We need our logs in S3. What's our AWS account structure, and where would this go?"

An agent investigates accounts, VPCs, and existing log paths. That investigation produces useful evidence before the human has decided whether this is a small configuration change or a larger body of work.

The findings should remain available if the work grows. The human should not have to invent a project structure before asking the question, or repeat the investigation because its output predates that structure.

### 2. Discover an approach without changing the underlying goal

The investigation finds that logs already go to Datadog. Datadog Observability Pipelines Worker, or OPW, becomes a candidate for routing logs to both Datadog and S3.

Over further sessions, the human compares OPW with Vector and a plain syslog relay, investigates hosting requirements, and works through the tradeoffs with agents. The material includes factual findings and an interpretation of the alternatives. Those have different roles: a capabilities check supports a claim, while an options comparison explains a recommendation.

In the walkthrough, the human chooses OPW. The work needs to preserve why that option was selected and which alternatives were considered. The specific selection rationale must come from the actual discussion; it cannot be reconstructed from the fact that OPW was chosen.

The durable goal remains getting logs into S3. Naming and organizing everything solely around the chosen product would obscure that goal if the approach changes later.

### 3. Deployment becomes a concern with its own delivery

Hosting OPW involves EC2 in a production account, networking, and security approval. The human recognizes that deployment has become a substantial concern in its own right.

Separating deployment must preserve how it arose from the S3 investigation. Hosting evidence gathered earlier remains relevant to both. Separation should not make the original work appear to have lost its research or require divergent copies of the same evidence.

The S3 work retains a distinct responsibility: destination design, including bucket layout, retention, encryption, and writer permissions. Deployment supports that outcome; it does not replace it.

Later sessions focused on deployment need its current design and blockers, with enough S3 background to understand the destination. They do not necessarily need every earlier comparison in full.

### 4. Security approval adds external discussion and a blocker

Before deployment can proceed, the security lead needs to approve the design. The human prepares a Confluence page explaining the proposed deployment. An email response raises questions about public exposure and the scope of AWS Identity and Access Management permissions.

The email is a source of questions, not proof that the design changed or approval was granted. The human decides which questions to pursue and discusses the resulting changes with the agent.

A later deployment session needs to see that security approval is still pending, which questions remain open, and where the approval discussion lives. It should not infer approval from the existence of a polished page, a completed drafting task, or an encouraging comment.

### 5. Team tracking cuts across the technical work

The manager needs Jira items for provisioning EC2, networking, OPW configuration, and a runbook. The human wants those items findable with the design and implementation they concern.

One ticket concerns the S3 bucket and archive-destination permissions. Even if it was created during a deployment-focused session, its subject belongs with the S3 destination work. Where an item was created does not always determine where it is useful.

For a manager update, the human needs the relevant tickets across these connected subjects. They should not have to remember which conversation created each one.

### 6. A meeting crosses several bodies of work

An infrastructure engineer offers networking help. Their shared VPC redesign belongs to another initiative, but the meeting also concerns OPW placement, the S3 destination account, and the ASA network path.

The following meeting content is illustrative. It shows the distinctions that must survive processing:

| Kind of statement | Example |
| --- | --- |
| Suggested by the infrastructure engineer | Run OPW in the shared services VPC. |
| Suggested by the infrastructure engineer | Put the archive bucket in the log-archive account. |
| Suggested by the human | Reserve a /24 subnet for the pipeline. |
| Open question | Does ASA connectivity need a transit gateway attachment, or would VPC peering suffice? |
| Human action discussed | Draft the OPW network diagram by Friday. |
| Other person's action discussed | Check transit gateway quotas and confirm the subnet reservation with their team. |
| Formal decisions | None in this example. |

The meeting can be relevant to deployment, S3 archiving, ASA ingestion, and the other team's VPC redesign at once. That relevance does not mean all four designs have changed. Nor does it mean the human owns the other team's work.

The human needs to preserve the recording or its location, the raw transcript or notes, a readable cleaned account, and a useful summary. Cleaning should improve readability while preserving attribution and meaning. The original remains available when a summary leaves a consequential ambiguity.

The summary needs to distinguish what was discussed, decided in the meeting, suggested, left open, and assigned to each person. It also needs to make clear whether the human has subsequently considered those items for their own work.

### 7. Review the meeting before adopting its suggestions

The human returns with a request such as "go through yesterday's meeting with me." They may do this immediately after processing the meeting or in a later session.

In this illustrative review, the human makes different choices for different items:

| Meeting item | Human's response | Understanding that must survive |
| --- | --- | --- |
| Place OPW in the shared services VPC | Accept only if the subnet reservation is confirmed. | The placement is conditional, and confirmation is still needed. |
| Put the archive in the log-archive account | Discuss and accept because it matches the retention policy. | This is now an accepted S3 destination decision, with its reason. |
| Reserve a /24 | Defer until capacity is estimated. | The proposal remains available, but no reservation decision has been made. |
| Transit gateway or peering | Pursue the question. | ASA connectivity has an unresolved design question. |
| Draft the network diagram | Accept as a next action. | The human has agreed to the action; an agent has not automatically been assigned to execute it. |
| Quota check and subnet confirmation | Track as work awaited from the infrastructure engineer. | The dependency has an external owner. |

The review changes deployment, S3, and ASA understanding where the human makes a decision or accepts follow-up work. It does not silently update the other team's VPC plan. Relevant information can be communicated to that engineer without claiming ownership of their decisions.

Later sessions must distinguish an unreviewed suggestion from an accepted, conditional, deferred, or rejected item. They should also recognize that this meeting has already been reviewed, so the human does not have to adjudicate the same candidates repeatedly.

If a next action needs team tracking, it may become a Jira item. If it is a personal reminder, it should remain recognizable as the human's action rather than becoming an autonomous agent task.

### 8. A separate ingestion request creates a new relationship

The manager requests Cisco ASA firewall logs. Investigation compares a separate syslog server with reuse of OPW. In the walkthrough, the human chooses reuse.

That decision connects ASA ingestion to the deployment work. It also widens the deployment's scope because the ASA devices are in another network segment. The illustrative design requires additional routing and a transit gateway attachment.

One session can therefore change two subjects. ASA records the ingestion choice and why OPW was selected. Deployment records the additional network requirement and why it was introduced. The next deployment session must discover that requirement without replaying the entire ASA conversation.

By contrast, a session that merely reads deployment background should not make all of its new material part of deployment work. The system needs to distinguish using background from changing the work it describes.

### 9. Customer-device ingestion remains undecided

Customer-device logs introduce internet-originated traffic. The human considers a public OPW deployment behind an authorization layer and a relay through the product servers that forwards internally.

These are options under investigation. Authentication and exposure requirements must be established for the selected approach. The scenario does not assume a permanent limitation of any particular product version.

The record must preserve the alternatives and unresolved choice. It must not present customer-device ingestion as committed to the OPW deployment merely because that option was discussed. A dependency should become an accepted part of the plan when the chosen approach establishes it.

### 10. Return to the S3 destination

After deployment and ingestion discussions, the human returns to the original question of S3 layout and permissions. They need to work on prefixes, partitioning, retention and lifecycle, encryption, and the writer's access policy.

They need enough deployment context to know what the pipeline will emit. Conversely, a deployment session configuring the S3 output needs the accepted destination design. This exchange of information does not mean the two subjects have become indistinguishable or that each session needs all of both histories.

If the bucket and permissions acquire their own substantial approval process, the human may separate that work further. The organization should accommodate that later discovery without requiring the human to predict it at the start.

### 11. Implement and review across sessions

Implementation produces pull requests associated with the deployment. The human needs to find them alongside the design, approval state, and supporting evidence.

A coordinating agent may distribute reviews of several pull requests to other agents. When the human resumes the review work, it should be possible to identify which items were handled, what the reviews found, and what remains. Starting another session should not cause completed reviews to be repeated unknowingly. A changed pull request should remain distinguishable from the version previously reviewed.

## What returning to the work should provide

The human wants to ask practical questions without knowing where each answer was first recorded:

| Question | Required understanding |
| --- | --- |
| "Pick up the OPW deployment." | Accepted direction, conditional decisions, current scope, blockers, next work, and access to relevant evidence. |
| "What's waiting on security?" | Pending approvals and unanswered questions, with the relevant external discussion. |
| "Give me the Jira items for my update." | Items across the relevant connected work, regardless of which session created them. |
| "Which meetings do I still need to go through?" | Which material awaits the human's consideration, including partially considered material. |
| "What do I owe, and what am I waiting on?" | The human's accepted actions separated from dependencies owned by other people. |
| "What have I discussed with the infrastructure engineer?" | Relevant meetings and exchanges across subjects, with enough context to understand their meaning. |
| "Why did ASA end up depending on OPW?" | The alternatives, the human's decision, and the deployment changes caused by it. |
| "How did my thinking on the S3 design evolve?" | The sequence of meaningful changes and their reasons, with original discussions available for deeper inspection. |

Discovery should provide enough context to choose what to read. Routine continuation should not require loading every transcript, meeting, and technical comparison.

## What this scenario requires of a workflow

The workflow must accommodate scope discovered through work, shared material across organizational boundaries, and decisions whose consequences reach several subjects. An exclusive folder hierarchy alone cannot express why one meeting matters to several independently owned outcomes.

The human needs both trustworthy current understanding and recoverable history. A single undifferentiated activity log forces each successor to decide which statements still apply. A polished current summary without its reasons loses the understanding needed to revisit decisions.

External input must remain attributable. Summarizing a meeting is different from adopting its suggestions, and accepting a personal action is different from assigning an agent to perform it.

The storage and workflow design must account for approvals, email, meetings, and tickets as well as code and agent-generated evidence. The scenario leaves open how to implement cross-work discovery, track partially reviewed material, and represent personal actions. Those mechanisms should be judged by whether they preserve the distinctions and support the questions above.
