---
title: Pipeline workers
group: area
icon: cpu
prefix: pw
updated: 2026-09-29
---

Three workers, one per zone, so a zone can fail without losing logs; what they may drop waits on security's list (D7).

## In short

Three OPW workers, one per availability zone, take firewall logs from Firewall intake and customer logs from Customer intake. They drop what we don't need, send the rest to Datadog, and write everything to the S3 archive (D4, E4).

They run in their own VPC if D1 lands on B. What's open here is what they drop (D7), which waits on security's list (Q9), and whether our Datadog site is authorized for this data (Q6).

## Requirements

## Design

::: design-card title="The workers and their network" diagram=pw-design
Three workers in the Observability VPC, sending to Datadog and the archive.
:::

## How it measures up

## Risks

## Decisions

## Open questions
