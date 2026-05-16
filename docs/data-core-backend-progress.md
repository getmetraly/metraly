# Data Core Backend — Implementation Progress

> Source of truth: `../../docs/tech/data-core-architecture.md`
> Last updated: 2026-05-16

## Current status

| Contract | Status | Notes |
|---|---|---|
| SourceConnection | planned | no migration, no repo, no service |
| CredentialRef | planned | no vault abstraction |
| ConnectionTestResult | planned | no endpoint |
| CollectorRun | planned | no model in api; collectors write CH |
| RawSourceEvent | planned | no model in api |
| NormalizedEvent | planned | no model in api |
| IdentityMapping | planned | no model in api |
| MetricDefinition | planned | semantic layer missing |
| FormulaDefinition | planned | formula engine missing |
| MetricQuery | planned | Metric Explorer static |
| MetricQueryResult | planned | widget data is hardcoded preview |
| DataQualityContract | planned | no propagation |
| LineageContract | planned | no propagation |

## Architectural schism (top risk)
Collectors write **ClickHouse**. App API reads **Postgres** metric_data_points.
No normalized engineering-event bridge exists. Decision deferred to Phase 2/3.

## What this run implements
- Phase 1: Source Registry (SourceConnection, CredentialRef, ConnectionTestResult)
- Phase 2 foundation: CollectorRun status model
- Phase 2 foundation: RawSourceEvent contract
- Phase 3 spike: NormalizedEvent design
