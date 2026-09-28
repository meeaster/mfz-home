# Security view

Design docs often go to a security team as well as the working team. Give the overview's solution card, each area page's design where it matters, and each option in a brief a Security tab alongside its Architecture tab, so reviewers see the same picture with what they need added: where the compliance boundary is, every data flow, where flows cross the boundary, how each flow is protected, and where data rests. `assets/example/` has complete security views on its overview and on both options of its brief.

## When to include it

- Include a security view when the design or any option changes where data lives or travels, adds a network path, touches identity or keys, or sits in a regulated environment (GovCloud, FedRAMP, FIPS, CUI, PCI, HIPAA, customer data).
- When in doubt, include it. A reviewer who finds nothing to flag is still served by seeing that.
- Put compliance obligations in Requirements as Must items with their source ("Compliance: FIPS 140", "Compliance: GovCloud boundary"), so the comparison table shows which options meet them.
- Route security questions to whoever can answer them (security or compliance team, network team, vendor) like any other open question.

## What the view shows

| Part | Shows |
| --- | --- |
| Compliance boundary | The line data must not cross without a reason: a partition, an authorization boundary, a regulated environment. With no stated regime, draw where the data lives today (its account or region), name it plainly ("us-east-1 · where the data lives today"), and make crossing it a question for whoever sets data-residency rules rather than a finding. Red outline with its name on a tab. VPCs and accounts inside keep their normal zone styles. |
| Region labels | Small labels over what sits outside the boundary ("Outside our AWS", "Vendor"), so it's clear which side each box is on. |
| Numbered flows | One chip per data flow (F1, F2, …) on its line. Number flows per diagram; the table explains each. |
| Flow state | `flow cross` (red): leaves or enters the boundary. `flow warn` (amber): protection missing or unconfirmed. Plain `flow`: protected and inside. |
| Protection labels | How the flow is protected in transit, in a few words: "IPsec", "TLS · PrivateLink", "TLS · FIPS endpoint". Amber when protection is missing ("syslog · no TLS"). |
| Box security notes | Each box's second line states its security fact instead of its role: "EBS · KMS", "private only", "no public IP", "SSE-KMS". |
| Markers | Evidence and question markers as in the architecture view, placed where the doubt is: a VPN whose ciphers aren't confirmed, a vendor site whose authorization is unknown. |

Keep every box in the same place as in the architecture view. The diagram is usually taller, to fit the boundary and anything outside it; 912 × 440 works for most. Use `compact` on the diagram so box text fits.

## Tables under the diagram

**Data flows.** One row per flow:

| Column | Content |
| --- | --- |
| Flow | The flow chip, in the same state as the diagram |
| From → to | The two ends, with how it travels on a second line (`.sub`) |
| Data | What it carries and its classification ("Firewall logs · CUI") |
| In transit | Protocol and encryption, stated plainly, including what isn't known yet |
| Auth | How the ends authenticate (IAM role, security group, API key, mutual TLS) |
| Crosses | Which boundary it crosses; add `class="crosses"` to the cell when it's the compliance boundary |
| Assessment | A verdict (`yes`, `partly`, `no`) with a short reason, plus the evidence or question marker behind it |

Each flow row is a definition, so clicking its chip in the diagram opens a card with the row's details, just like evidence and questions:

- Give the row `id="B-F1" data-ref="flow"`, prefixed so IDs stay unique across the doc: the option letter in a brief, `S` for the overview's solution, or a short capital prefix for an area page (`AR-F1`).
- Put `data-ref-chip` on the row's flow chip.
- Put `data-ref-text` on the "from → to" text and `data-ref-detail="Path"` on its `.sub` line.
- Put `data-ref-detail="Data"`, `"In transit"`, `"Auth"` and `"Assessment"` on those cells, and `data-ref-status="Crosses:"` on the Crosses cell.
- In the diagram, make each chip a link to its row: `<a class="flow cross" href="#B-F1" style="…">F1</a>`.

**Where data rests.** One row per store: store (with where it lives on a second line), what it holds, encryption, how long it's kept, and an assessment.

## Claims need evidence

- Don't state that something is FIPS-validated, FedRAMP-authorized, encrypted with a particular key, or private without a finding behind it.
- Vendor and service claims need the vendor's documentation or a confirmation. Our own configuration needs the account, the infrastructure code, or the owning team.
- When it isn't known, the flow or store is `warn` or `partly`, with a question marker naming who can confirm it.
- A missing control that nobody disputes, such as syslog with no TLS, is a finding. Mark it `no`, and say what would fix it and when.

## Markup

```html
<article class="option opt-b">
  <div class="option-head">
    …
    <div class="view-toggle"><button type="button" data-view="architecture">Architecture</button><button type="button" data-view="security">Security</button></div>
  </div>
  <div class="view-panel" data-view-panel="architecture">
    <div class="diagram-wrap diagram-scroll"> … architecture diagram … </div>
  </div>
  <div class="view-panel" data-view-panel="security">
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
    <div class="security-key-wrap"><div class="diagram-key"> … </div></div>
    <div class="security-tables">
      <h4>Data flows</h4><p>…</p>
      <div class="table-wrap"><table class="table"> … </table></div>
      <h4>Where data rests</h4>
      <div class="table-wrap"><table class="table"> … </table></div>
    </div>
  </div>
  <div class="assess"> … </div>
</article>
```

- **Placing the boundary parts:**
  - Place the boundary before the zones and edges.
  - Place the boundary tab after the boxes, so it sits on top of the line.
  - Centre flow chips on the line where it crosses a boundary: `--x` = crossing x − 13, `--y` = line y − 9.
- **Choosing the view:**
  - Keep the rail's `data-view-all` toggle so a reader can switch every card at once.
  - Link a security reviewer to the built doc with `?page=overview&view=security` to open it on the overview in its security view.
  - Or set `<html data-default-view="security">` in a copy built for them.
- **Without the script,** both views show one after the other, with the security panel labelled.
