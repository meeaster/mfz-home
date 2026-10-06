# Security view

Design docs often go to a security team as well as the working team. Give the overview's whole-system card, each area page's design where it matters, and each option in a brief a Security tab alongside its Architecture tab, so reviewers see the same picture with what they need added: where the compliance boundary is, every data flow, where flows cross the boundary, how each flow is protected, and where data rests. `assets/example/` has complete security views on its overview and on both options of its brief.

## When to include it

- Include a security view when the design or any option changes where data lives or travels, adds a network path, touches identity or keys, or sits in a regulated environment (GovCloud, FedRAMP, FIPS, CUI, PCI, HIPAA, customer data).
- When in doubt, include it. A reviewer who finds nothing to flag is still served by seeing that.
- Put compliance obligations in Requirements as Must items with their source ("Compliance: FIPS 140", "Compliance: GovCloud boundary"), so the comparison table shows which options meet them.
- Route security questions to whoever can answer them (security or compliance team, network team, vendor) like any other open question.

## What the view shows

| Part | Shows |
| --- | --- |
| Compliance boundary | The line data must not cross without a reason: a partition, an authorization boundary, a regulated environment. With no stated regime, draw where the data lives (its account or region) with the design in place, since the view shows the design; name it plainly ("us-east-1 · where the data lives"), and make crossing it a question for whoever sets data-residency rules rather than a finding. When nothing crosses it, the boundary still frames the view, and the flows and where-data-rests tables carry the findings. Red outline with its name on a tab. VPCs and accounts inside keep their normal zone styles. |
| Region labels | Small labels over what sits outside the boundary ("Outside our AWS", "Vendor"), so it's clear which side each box is on. |
| Numbered flows | One chip per data flow (F1, F2, …) on its line. Number flows per diagram; the table explains each. |
| Flow state | `flow cross` (red): leaves or enters the boundary. `flow warn` (amber): protection missing or unconfirmed. Plain `flow`: protected and inside. |
| Protection labels | How the flow is protected in transit, in a few words: "IPsec", "TLS · PrivateLink", "TLS · FIPS endpoint". Amber when protection is missing ("syslog · no TLS"). |
| Box security notes | Each box's second line states its security fact instead of its role: "EBS · KMS", "private only", "no public IP", "SSE-KMS". |
| Markers | Evidence and question markers as in the architecture view, placed where the doubt is: a VPN whose ciphers aren't confirmed, a vendor site whose authorization is unknown. |

Keep every box in the same place as in the architecture view. The diagram is usually taller, to fit the boundary and anything outside it; 912 × 440 works for most. Use `compact` on the diagram so box text fits.

## Tables under the diagram

**Data flows.** One Flows record per flow in design.json, rendered by `<!-- component flows B -->` in the security component:

```markdown
### B-F2 · Syslog server → OPW workers
- Path: through the Transit Gateway
- Data: Firewall logs · CUI
- In transit: Syslog over TCP with no TLS. Leaves one VPC for another.
- Auth: Security group
- Crosses: No · VPC boundary
- Assessment: No · Add TLS on the relay before go-live [D2]
```

| Field | Content |
| --- | --- |
| Heading | The flow's ID and its two ends. Prefix the ID so it stays unique across the doc: the option letter in a brief, `S` for the overview's whole system, or a short capital prefix for an area page (`AR-F1`). The flows component shows the records with its prefix. |
| Path | How it travels |
| Data | What it carries and its classification |
| In transit | Protocol and encryption, stated plainly, including what isn't known yet |
| Auth | How the ends authenticate (IAM role, security group, API key, mutual TLS) |
| Crosses | `Yes` when it crosses the compliance boundary, else `No`, then `·` and which boundary |
| Assessment | `Yes`, `Partly` or `No`, a short reason, and the evidence or question behind it in brackets |

The chip's colour follows, first match wins: `warn` when the assessment is No, `cross` when it crosses the boundary, `warn` when it's Partly and stays inside, plain otherwise. `check` warns when a diagram chip's colour differs from its row. Each row is a definition, so its chip in the diagram opens a card with the row's details. Make each chip in the diagram a link to it, in the same colour: `<a class="flow cross" href="#B-F1" style="…">F1</a>`.

**Where data rests.** One row per store: store (with where it lives on a second line), what it holds, encryption, how long it's kept, and an assessment.

## Claims need evidence

- Don't state that something is FIPS-validated, FedRAMP-authorized, encrypted with a particular key, or private without a finding behind it.
- Vendor and service claims need the vendor's documentation or a confirmation. Our own configuration needs the account, the infrastructure code, or the owning team.
- When it isn't known, the flow or store is `warn` or `partly`, with a question marker naming who can confirm it. The question blocks the flow (`Blocks: S-F5`) and the flow's Assessment cites it, so it has a place in the design even when no decision waits on it.
- A missing control that nobody disputes, such as syslog with no TLS, is a finding. Mark it `no`, and say what would fix it and when.
- A control the design adds is intended until something shows it working. The requirement it serves reads `Design: Covers` with `Still to show: Intended · <how it will be shown>`; only evidence (a test, a scan, the configuration read back) makes it `Demonstrated`. A security view may draw the control, labelled as added, but prose and tables don't say it's in place.

## Markup

The security view is a component of the doc's own, named on the block that draws the card: `B-security=d1-b-security` on `::: options`, or `security=system-security` on `::: design-card`. The card gets the Architecture / Security switch, and the component holds what the security panel shows:

```html
<div class="diagram-wrap diagram-scroll">
  <div class="diagram compact" style="--w:912;--h:440">
    <span class="region-label" style="--x:0;--y:64">Outside our AWS</span>
    <div class="boundary" style="--x:190;--y:16;--w:570;--h:408"></div>
    … zones, edges, boxes …
    <span class="boundary-tab" style="--x:206;--y:5"><svg><use href="#i-shield-check"/></svg>AWS GovCloud (US) partition · us-gov-west-1</span>
    <a class="flow cross" href="#B-F1" style="--x:177;--y:121">F1</a>
    <span class="edge-label" style="--x:158;--y:140">IPsec</span>
    …
  </div>
</div>
<div class="security-key-wrap"><!-- component diagram-key title="Reading the security view" items="boundary | crosses | attention | protected | transit" --></div>
<div class="security-tables">
  <!-- component flows B -->
  <h4>Where data rests</h4>
  <div class="table-wrap"><table class="table"> … </table></div>
</div>
```

- **Placing the boundary parts:**
  - Place the boundary before the zones and edges.
  - Place the boundary tab after the boxes, so it sits on top of the line.
  - Centre flow chips on the line where it crosses a boundary: `--x` = crossing x − 13, `--y` = line y − 9.
- **Choosing the view:**
  - Keep the top bar's `data-view-all` switch so a reader can switch every card at once.
  - Link a security reviewer to the built doc with `?page=overview&view=security` to open it on the overview in its security view.
  - Or set `<html data-default-view="security">` in a copy built for them.
- **Without the script,** both views show one after the other, with the security panel labelled.
