---
title: S3 archive
group: area
icon: database
prefix: s3
updated: 2026-09-29
---

Every log kept for a year, each customer's readable only by them; whether one shared customer bucket holds up as customers grow is still open (D6).

## In short

Every log the workers receive is also written to S3 and kept for a year (D5). The archive is the record we'd search during an investigation, and the copy we'd hand a customer who asks for their own logs.

Our own logs and customer logs go to separate buckets. Inside the customer bucket, each customer gets their own prefix and their own KMS key, so a role or key for one customer can't read another customer's logs.

Whether one customer bucket is enough, or each customer needs a bucket of their own, is still open (D6). It depends on how many customers we expect in the first year (Q8).

## Requirements

## Design

::: design-card title="Buckets, prefixes and keys" diagram=s3-buckets
Two buckets in the archive account, one prefix and key per customer.
:::

## How it measures up

## Decisions

## Open questions
