---
title: Customer intake
group: area
icon: plug
prefix: ci
updated: 2026-09-29
---

Customers reach one private endpoint and nothing else of ours; how it's set up waits on where the workers run (D1).

## In short

From November, the first three customers send us their logs over a private connection. The plan so far is an AWS PrivateLink endpoint in the workers' network, so customers reach that one service with no routes into the rest of ours (E6).

How customers connect is settled after where the workers run (D1, D3), and sized once we know their volume (Q3).

## Requirements

## Design

::: design-card title="From customers to the workers" diagram=ci-design
A PrivateLink endpoint in the workers' VPC, assumed until how customers connect (D3) is settled.
:::

## How it measures up

## Risks

## Decisions

## Open questions
