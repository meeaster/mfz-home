---
title: Overview
heading: Log ingestion in our cloud
group: overview
context: observability-pipeline / opw-deployment
updated: 2026-09-29
---

How firewall and customer logs are collected, filtered and kept in GovCloud.

## In short

Firewall logs from our 14 sites reach Datadog today, and we pay for all of them, noise included. We keep no copy of our own, and customers who want to send us their logs have no way in.

We're putting a pipeline in between: servers running Observability Pipelines Workers (OPW) that drop the noise, send the rest to Datadog, and keep a full copy in S3. From November it also takes logs from customers over a private connection.

The design has four areas: how firewall logs get in, how customer logs get in, the workers, and the S3 archive. Where the workers run (D1) shapes three of them and has a brief of its own.

## What we're after

<!-- component story -->

::: goals
:::

::: scope-note
:::

## Requirements

## How it fits together

<!-- component area-map -->

## The whole system

::: diagram-key design title="Reading the diagrams" items="today | new | pending | decision | evidence | question"
:::

::: design-section section=how-it-works
:::

::: design-card title="The pipeline end to end" diagram=system security=system-security parts=false
Workers in their own VPC in GovCloud, with the syslog server relaying firewall logs to them.
:::

## How it measures up

## Cost

## Risks

## Phases

## Decisions

## Open questions
