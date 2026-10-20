---
title: Firewall intake
group: area
icon: shield
prefix: fw
updated: 2026-09-29
---

The path from the 14 sites already exists; only [the last hop to the workers](#D2) is still open.

## In short

Every site's ASA firewall sends syslog over its site VPN to the syslog server in Shared Tooling. That path exists today and carries about 1.2 TB a month (E1, E2).

What's open is [the last step](#D2): keep the syslog server as a relay to the workers, or point the firewalls straight at them. Sending direct needs [a VPN route into the workers' network](#Q1) and proof that [OPW takes UDP syslog behind a load balancer](#Q4).

## Requirements

## Design

::: design-card title="From the sites to the workers" diagram=fw-design
Today's path, with the relay as the last hop until [the firewall log path](#D2) is settled.
:::

## How it measures up

## Risks

## Decisions

## Open questions
