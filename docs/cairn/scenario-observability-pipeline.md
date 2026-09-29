# Scenario: the observability pipeline

This document follows one real body of work from its first question to several interlocking efforts. At each step it shows what Cairn records. The work: getting logs into S3, which grew into a Datadog Observability Pipelines Worker (OPW) deployment, Cisco ASA ingestion, customer-device logs, a security approval, Jira tracking, and meetings with an engineer from another team.

The point is to test the [design](design.md) against how the work actually unfolds. Nobody knows the structure up front. It appears as the work is explored, it crosses team and initiative boundaries, and most of it happens outside the code: approvals, tickets, email, and meetings. Terms follow [TERMINOLOGY.md](../../packages/cairn/TERMINOLOGY.md).

People appear by role. Session labels (S1, S2, …) stand in for harness session IDs. Paths are shortened to their folder under the Cairn root. The details are illustrative, but the sequence follows the human's account.

## Cast

| Kind | In this scenario |
| --- | --- |
| Efforts, as they emerge | `logs-archived-to-s3`, `opw-deployment`, `asa-log-ingestion`, `customer-device-logs`, and, from another initiative, `shared-vpc-redesign` |
| People | You. The **security lead**, who approves exposure and IAM. Your **manager**, who tracks work in Jira. The **infra engineer**, from another team, who advises on AWS networking and owns the shared VPC work. |
| Places outside Cairn | Confluence, Jira, GitHub, email, the meeting recorder, AWS, Datadog |

## Timeline

### 1. A question with no effort yet

You ask: "We need our logs in S3. What's our AWS account structure, and where would this go?"

- **S1** starts. The plugin records the session, with no effort.
- An explore subagent maps the accounts, VPCs, and existing log paths. It writes `sessions/…/S1/aws-account-structure.md` and describes it as `evidence`.
- **Cairn state:** one unattached session with one evidence file. If you stopped here, nothing would need an effort.

### 2. The scope becomes clear

The research turns up that you already send logs to Datadog, and that Datadog's Observability Pipelines Worker can route to both Datadog and S3.

- The session now has real scope. S1's agent calls `catalog_session`: it describes the session and attaches a new effort, **Logs archived to S3**, named for the outcome and not the approach. The duplicate check finds no similar effort.
- The agent writes `efforts/logs-archived-to-s3/effort.md`. Summary: "Goal: archive logs to S3. Leading approach: Datadog OPW (dual routing). Status: comparing options."
- The earlier evidence joins the effort automatically, because S1 is now attached.

### 3. More sessions funnel in

Over the next days you open sessions to compare OPW with Vector and a plain syslog relay, and to read the OPW hosting docs.

- **S2** and **S3** each start with "continuing the S3 log archive". `catalog_find` returns the effort, and each session attaches to it and reads its `effort.md`.
- They produce `evidence` (an OPW capabilities check, a Vector comparison) and a `synthesis` (an options matrix).
- The decision "use OPW" is about the system, so it goes into a local design, `efforts/logs-archived-to-s3/design.md`: one connected document with the problem, the approach, how the pieces fit, and the decision with its reasoning and the alternatives weighed. `effort.md` points to it.
- **Cairn state:** one effort, three sessions, several files, and a small local design. This is the default, and it's fine.

### 4. A piece develops its own life, so it splits

Deploying OPW turns into its own project: EC2 in the production account, networking, and, critically, security approval to run it.

- In **S4** you say: "the deployment is its own thing." The agent calls `catalog_effort` with `split`, creating **OPW deployment on AWS** with a `split_from` link to the S3 effort. It includes the OPW hosting evidence from S2 and S3. Those files stay in the S3 effort as well, so history isn't rewritten.
- The S3 effort gets `depends_on opw-deployment`, because the archive can't happen without the pipeline.
- `efforts/opw-deployment/effort.md` starts with its own summary. The S3 effort's `effort.md` notes the split in one line and keeps its remaining scope: the destination (bucket layout, retention, writer permissions).
- S4 and later deployment sessions attach to `opw-deployment`.

### 5. A Confluence page for security approval

The security lead must approve the deployment design before anything is built. Others now need to see the design, and two efforts share it, so it outgrows the local file.

- **S5**, attached to `opw-deployment`, writes the local design up as a stable design, `designs/log-ingestion/` (`design-docs`): the problem and its value, goals, how it works, requirements, decisions with their options, and phases, one per effort (the deployment, the S3 archive). The stable design supersedes the local file. The agent links the design to both efforts and publishes its doc to Confluence for the review, registering the page URL with `catalog_describe`: category `deliverable`, pointer type `confluence_page`.
- The security lead replies by email with questions about public exposure and IAM scope. You paste the thread in, and the agent saves it as `sources/email/opw-exposure-and-iam-scope.md` (`source`, with `origin` holding the message ID). The email is external input: its questions don't reach the design until you decide, at intake, which ones to pursue. Here you do so right away in S5, and two become open questions in the design, each with `Asked: security lead · 2026-10-03 · email`.
- **Where approval state lives:** in the design, as state: the deployment phase is In progress, and the open questions say who was asked and when. The effort's summary says the security review is open and points to them. Cairn doesn't track approval workflow, and nothing records a waiting-on list; "what's blocking?" is answered by reading the questions.

### 6. Jira items so your manager can track the work

- **S6**, attached to `opw-deployment`, creates Jira items with `jira-writer`: provision EC2, networking, OPW configuration, and runbook. It registers each URL (`deliverable`, pointer type `jira_issue`).
- The effort view now has a **Jira items** group. For a status update to your manager, `catalog_find` with `pointer_type: jira_issue` across the linked efforts lists every ticket, whichever session created it.
- One Jira item, "S3 bucket and IAM for archive destination", really belongs to the S3 effort. The agent gives it an explicit `include` membership in `logs-archived-to-s3` and an `exclude` from `opw-deployment`, so each ticket appears where the work is.

### 7. The infra engineer joins, and a meeting gets processed

The infra engineer from another team offers help with networking. You tag the efforts they touch with `person:infra-engineer`, and you meet.

After the meeting you open a short session, **S7**, to process it. Processing turns the meeting into files in `sources/meetings/2026-10-02-infra-working-session/`. It doesn't change any effort's or design's records.

1. **Recording:** it stays where the recorder put it. The agent registers its URL (`source`).
2. **Raw transcript:** saved unchanged as `transcript-raw.md` (`source`).
3. **Cleaned transcript:** `transcript.md` (`source`), with speakers labeled by role, filler and crosstalk removed, and nothing added. The raw transcript is linked to it with `informs`, so the original stays one step away.
4. **Summary:** `summary.md` (`synthesis`). Its description is a short abstract: "Infra engineer and you on OPW placement, the S3 account, the ASA network path, and subnet reservations." The body keeps these apart:

```text
Discussed      OPW placement; S3 archive account; ASA network path; subnet capacity
Decided        (none formally)
Suggested      Infra engineer: run OPW in the shared services VPC
               Infra engineer: put the archive bucket in the log-archive account
               You: reserve a /24 for the pipeline in the shared VPC
Open           Does the ASA path need a transit gateway attachment, or does VPC peering suffice?
Action items   You: draft the network diagram for OPW placement (by Friday)
               Infra engineer: check transit gateway quotas
               Infra engineer: confirm the subnet reservation with their team
Intake         (pending)
```

5. **Where it appears:** S7 attaches to the four efforts the meeting concerned: `opw-deployment`, `logs-archived-to-s3`, `asa-log-ingestion`, and `shared-vpc-redesign`, the infra engineer's own initiative. The meeting's files appear in all four effort views as sources and synthesis, and each view shows it as awaiting intake.

**Four efforts is correct, because nothing has been decided yet.** Attaching the meeting only makes it findable where it's relevant, and adds nothing to any effort's validated state. The summary's abstract lets each view read like a list of meetings with one line each.

**This is where a hierarchy would break.** `shared-vpc-redesign` belongs to a different initiative, owned by another team. No single tree holds a meeting that is about four efforts across two initiatives. Attachments and links do.

### 8. Intake: deciding what the meeting actually changed

The next morning you open **S8**: "go through yesterday's meeting with me." The agent reads the summary and walks you through each candidate.

| Candidate | Your call | Where it lands |
| --- | --- | --- |
| Run OPW in the shared services VPC (infra engineer's suggestion) | Accept, with a condition: only if the subnet reservation is confirmed | The design: "Where do the workers run?" becomes Leaning shared services VPC, waiting on the subnet question; a `changes.md` entry under `meeting 2026-10-02` |
| Archive bucket in the log-archive account | Discuss. After a short exchange you accept it, because it matches the retention policy | The design: a decided decision in the S3 archive phase, with a `changes.md` entry |
| Reserve a /24 for the pipeline | Defer until the capacity estimate is done | Stays in the summary, marked deferred |
| Transit gateway or peering for ASA | Pursue | The design: an open question, `Asked: infra engineer · 2026-10-02 · meeting` |
| Transit gateway quotas; subnet confirmation (infra engineer's) | Accept as open questions | The design: two open questions, each asked of the infra engineer at the meeting |
| Draft the network diagram (yours) | Noted | Stays in the summary as an action item with you as owner; records don't copy action items |

- S8 attaches to the efforts whose state it changed: the design is linked to `opw-deployment` and `logs-archived-to-s3`, and `asa-log-ingestion` gains the pointer to the transit gateway question. It doesn't attach to `shared-vpc-redesign`, which that team maintains; you tell the infra engineer about the subnet instead.
- The agent fills in the summary's Intake section with each outcome and where it went, so a later pass knows the meeting has been reviewed. The meeting no longer shows as awaiting intake.
- If you had wanted the meeting's to-dos tracked by your manager, the network diagram would also have become a Jira item, registered as a `deliverable`.

**Why intake is separate from processing:** a suggestion that sounded fine in the room isn't a decision until you've looked at it with the rest of the effort in view. Here that review changed two outcomes: the VPC placement became conditional, and the /24 was deferred. The design and `effort.md` only ever hold what you confirmed.

### 9. A new request, and a relationship discovered late

Your manager asks for Cisco ASA firewall logs.

- **S9** starts unattached, researches the options (a syslog server, or reusing OPW), and creates the effort **Cisco ASA log ingestion**.
- The comparison favors reusing OPW, and you decide to reuse it. Because the decision was made with you in a working session, it goes straight into the records, with no intake step: the ASA effort's `effort.md` records it, and the design gains an ASA phase and the widened network path, with a `changes.md` entry citing S9. The agent adds the link `asa-log-ingestion depends_on opw-deployment`.
- Reusing OPW widens the deployment's scope: the ASA devices sit in another network segment, so a transit gateway attachment and VPC routing are needed. That decision changes the deployment, so S9 also attaches to `opw-deployment`; the scope change itself lives once, in the design, and the deployment effort refers to it. S9 now appears in both effort views, which is accurate.
- The next deployment session reads `opw-deployment/effort.md` and the design's `changes.md` entries since its last session, and sees the widened scope. Through the incoming link it sees only the ASA effort's summary, which is enough.

### 10. An effort that stays undecided

Next come customer-device logs. Customers' devices would send logs over the internet.

- **S10** creates **Customer device log ingestion** and compares a public OPW behind an authorization layer (OPW has no authentication of its own) with a relay through the product servers that forwards internally.
- No link to `opw-deployment` is added yet. The dependency exists only if the public-OPW option wins. The effort's local `design.md` states that, and the link is added when the decision is made.

### 11. Back to the original effort

The S3 effort still owns the destination.

- **S11** says "let's design the S3 log layout and permissions". `catalog_find` returns `logs-archived-to-s3`, and the session resumes it: prefix and partition scheme, retention and lifecycle, encryption, and the IAM policy for OPW's writer role.
- It reads `opw-deployment`'s summary through the link for what the pipeline will emit, and records its decisions in the S3 archive phase of the design.
- When an OPW session later configures the S3 output, it reads the S3 summary. There's no reverse `depends_on`. If the IAM policy grew its own security review, it would split into its own effort, and `opw-deployment` would depend on it.

### 12. Building and reviewing

Implementation sessions attach to `opw-deployment` and open PRs, which are registered as `deliverable`s with pointer type `pull_request`.

When several PRs are ready, a Chief session reviews them in a loop. Each orchestrator's session carries a `workstream` key and the PR as its `subject` (`github:org/infra#88`). On a second pass, Chief finds the existing workstreams by subject and skips PRs it has already handled.

## The result

The effort graph after these steps:

```text
Logs archived to S3 ──depends_on──▶ OPW deployment on AWS ◀──depends_on── Cisco ASA log ingestion
        ▲                                  │
        └────────────── split_from ────────┘
                                                            Customer device log ingestion
                                                            (link added once the option is chosen)

shared-vpc-redesign (another initiative) ── shares S7 (a meeting) with three of these efforts
```

A generated effort index, abridged:

```text
# OPW deployment on AWS            active · depends on: none · needed by: Logs archived to S3, Cisco ASA log ingestion
                                   split from: Logs archived to S3 · tags: system:aws, system:datadog, person:infra-engineer

Summary (from effort.md): Deployment phase of the log-ingestion design, in progress. OPW on EC2,
leaning to the shared services VPC pending the subnet question; widened for the ASA path; security review open.

Deliverables    Confluence: OPW deployment design (security review)
                Jira: provision EC2 · networking · OPW config · runbook
                PR #88 Terraform module for OPW
Designs         designs/log-ingestion (stable; phases: deployment, S3 archive, ASA)
Sources         Email · OPW exposure and IAM scope · meeting 2026-10-02 recording, raw and cleaned transcripts
Synthesis       meeting 2026-10-02: "OPW placement, S3 account, ASA path, subnets" (intake done)
                OPW options matrix (from S3 effort, included at split)
Evidence        OPW hosting requirements · capacity estimate
Records         effort.md
Sessions        S4 split the deployment out · S5 security design page · S6 Jira items · S7 infra meeting ·
                S8 meeting intake · S9 ASA reuse, widened scope · …  (each with its conversation export)
```

## Questions this should answer later

| You ask | How Cairn answers |
| --- | --- |
| "Pick up the OPW deployment." | Find the effort. Read its `effort.md`, the design with its `changes.md` entries since the effort's last session, and its linked efforts' summaries. The effort view lists what exists. |
| "What's waiting on security?" | The design's open questions whose Who is the security lead, with their `Asked` dates. The Confluence deliverables are listed in the views. |
| "Give me every Jira item for my update." | `catalog_find` with `pointer_type: jira_issue`, over the linked efforts, or filtered by `initiative:` if you chose to tag them |
| "What do I still need to go through from meetings?" | In v1, each meeting summary's Intake section. A cross-effort inbox is a deferred idea (parsed items or a curated layer). |
| "What do I owe, and what am I waiting on?" | Ask an agent: it reads the action items in the recent meeting summaries and the open questions' `Asked` fields across the active efforts' designs, and proposes the list in the conversation. No file keeps a to-do list. |
| "What have I discussed with the infra engineer?" | Efforts tagged `person:infra-engineer`, then the meeting summaries in them, whose descriptions name attendees by role |
| "Why did ASA end up depending on OPW?" | The `depends_on` link, S9's session description, the decision and its `changes.md` entry in the design, and S9's conversation export for the actual discussion |
| "How did my thinking on the S3 design evolve?" | The sessions attached to `logs-archived-to-s3`, in order, with their conversation exports |

## What this scenario confirms

- **No structure up front.** Work funnels into one effort until a piece has its own life. Splitting is explicit and loses nothing.
- **Links, not hierarchy.** Relationships are found late ("ASA reuses OPW"), and material crosses initiatives (a meeting about four efforts in two initiatives). Tags stay useful for filtering (`person:`, `system:`).
- **Records hold only what you validated, as state.** Meetings and emails become artifacts (raw, cleaned, and summarized), attached wherever they're relevant. Only intake, done deliberately with you, moves an accepted decision or open question into the design or effort it concerns; action items stay in their summaries. That keeps each `effort.md` small and trustworthy, and the reading scope (attached efforts in full, linked efforts by summary) keeps reading bounded.
- **Designs grow out of efforts.** A local design is enough until others need to see it; then it's written up as a stable design whose phases the efforts deliver.
- **Most of the material isn't code.** Confluence pages, Jira items, emails, recordings, and meeting notes are ordinary artifacts: URL pointers or saved `source` files, with categories and pointer types.

## Gaps it exposes

1. **An intake inbox.** Nothing can yet ask "which meetings haven't I gone through?". The design lists an intake inbox as a deferred idea.
2. **Action items across efforts.** Action items live in meeting summaries, and an agent assembles them on request. Structured action items, for a view across efforts without a model, are a deferred idea.
3. **Meeting processing and intake as skills.** Both are repeatable and good candidates for skills once they've been done by hand a few times. This is a deferred idea.
4. **People on artifacts.** v1 finds people through `person:` tags on efforts and through roles named in meeting abstracts. This is a deferred idea.
