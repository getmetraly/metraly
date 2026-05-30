# Normalized Event Model — Design Spike

> Status: historical design spike with partial implementation already landed
> Claim level: mixed — event model ideas below are partly implemented, partly still deferred

## Purpose
Define the minimum normalized event types and their field mappings needed to compute MVP metrics
from GitHub PR review flow, GitHub Actions workflow runs, and Jira sprint delivery.

## MVP event types and source mappings

| Normalized event | Source type | Raw trigger | Key fields extracted |
|---|---|---|---|
| pull_request.opened | github | `pull_request` webhook / REST list | pr_id, author_login, base_ref, created_at, repo_id |
| pull_request.review_requested | github | `pull_request` event, `review_requested` action | pr_id, reviewer_login, requested_at |
| pull_request.review_submitted | github | `pull_request_review` webhook | pr_id, reviewer_login, state (approved/changes_requested), submitted_at |
| pull_request.merged | github | `pull_request` webhook, action=closed+merged | pr_id, merged_at, merge_commit_sha, additions, deletions |
| workflow_run.started | github_actions | `workflow_run` webhook, action=requested | run_id, workflow_name, head_branch, started_at, repo_id |
| workflow_run.completed | github_actions | `workflow_run` webhook, action=completed | run_id, conclusion (success/failure/cancelled), completed_at, duration_ms |
| issue.created | jira | issue created webhook | issue_id, issue_type, priority, sprint_id, created_at, project_key |
| issue.status_changed | jira | issue updated webhook, status change | issue_id, from_status, to_status, changed_at |
| issue.closed | jira | issue updated, status=Done | issue_id, resolved_at, story_points |
| sprint.started | jira | sprint started webhook | sprint_id, start_date, planned_points |
| sprint.closed | jira | sprint closed webhook | sprint_id, end_date, completed_points, incomplete_points |

## Identity resolution
For each event with a `login` or `accountId`, the normalizer looks up `IdentityMapping` by:
1. Exact match on `source_type + external_id`
2. Fuzzy match on email (if email scopes available)
3. Fall back to `unresolved` with `mapping_confidence = 0`

Unresolved identities render with a warning in grouped metrics (§14 of data-core-architecture.md).

## Additivity classification for MVP metrics

| Metric | Event basis | Additivity | Notes |
|---|---|---|---|
| pr_count | pull_request.merged | additive | count |
| pr_cycle_time | pull_request.merged, CycleTimeSeconds | non_additive | use median/p95, not sum |
| review_latency | pull_request.review_submitted, ReviewLatencySeconds | non_additive | median |
| build_failure_rate | workflow_run.completed | ratio | failures / total |
| build_duration_p95 | workflow_run.completed, DurationSeconds | distribution | p95 |
| sprint_predictability | sprint.closed | ratio | completed_points / planned_points |

## Roadmap-aligned follow-up

Implemented already on the app backend:
1. `normalized_events` storage on the Postgres-backed app path
2. `NormalizerSvc.Normalize(...)` for the current supported event set
3. normalizer wiring into the app collector pipeline
4. `IdentityMapping` persistence and unresolved-identity handling

Still open or verification-bound:
1. confirm review-requested / review-submitted coverage before documenting them as current runtime facts
2. extend source-health and lineage contracts so normalized-event gaps can be explained to the UI
3. keep ClickHouse references historical unless a real bridge is implemented and documented
