---
phase: 1
plan: 01D-runtime-docs
subsystem: runtime-docs
tags: [makefile, docs, docker-compose, verification]
requires: [FOUND-01, FOUND-04, FOUND-05]
provides:
  - Community Preview runtime command cleanup
  - Final Phase 1 verification evidence
affects:
  - Makefile
  - README.md
  - CLAUDE.md
  - docker-compose.yaml
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
tech-stack:
  added: []
  patterns: [runtime-doc-truthfulness, final-verification]
key-files:
  created: []
  modified:
    - Makefile
    - README.md
    - CLAUDE.md
    - docker-compose.yaml
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - Default local runtime is documented as API, UI, Postgres/TimescaleDB, and Redis.
  - Docker Compose now waits for Redis and Postgres health before starting the fail-fast API runtime.
  - Deferred raw-event-store references in app-local docs are retained only as future ingestion context.
  - Historical superpowers docs in the separate docs repository were left unchanged because they describe prior cleanup plans, not current default runtime requirements.
requirements-completed: [FOUND-01, FOUND-04, FOUND-05]
duration: "in progress"
completed: 2026-05-05
---

# Phase 1 Plan 01D: Runtime Docs And Final Verification Summary

Makefile, README, and CLAUDE.md now describe the Community Preview runtime without making any deferred runtime service part of the default local stack.

## Tasks Completed

| Task | Status | Commit |
|------|--------|--------|
| 01D-1 Clean Makefile runtime commands | Complete | `314361c` |
| 01D-2 Update app README and CLAUDE runtime docs | Complete | `314361c` |
| 01D-3 Clean moved app docs runtime mismatch claims | Complete | no change required |
| 01D-4 Final Phase 1 verification and planning status update | Complete | `0207d4b` |
| Review fix: health-gate compose dependencies | Complete | `d30cdb1` |

## Verification

| Command | Result |
|---------|--------|
| `GOCACHE=/tmp/go-build go test ./...` | PASS |
| `GOCACHE=/tmp/go-build go vet ./...` | PASS |
| `make -n up` | PASS |
| `make -n health` | PASS |
| `docker compose config` | PASS |
| `find . -path './.worktrees' -prune -o -name '*.go' -print \| xargs -r awk 'FNR==1 && $0 !~ /^\/\/ SPDX-License-Identifier: AGPL-3.0-or-later$/ { print FILENAME }' \| sort -u` | PASS, empty output |
| `rg -n "raw event store|deferred runtime service|old test data target" README.md CLAUDE.md Makefile /home/zubarev/Projects/metraly/docs/tech/app -g '*.md'` | PASS; app-local hits are deferred/future context, docs-repo hits are historical superpowers cleanup artifacts |

Docker Compose smoke (`make up` + curl + `make down`) was not run as a blocking check. The dry-run Makefile checks passed, and Docker-dependent Go integration tests passed through Testcontainers.

## Acceptance Evidence

- `Makefile` no longer contains the stale runtime-service host or the stale data-target command.
- `Makefile` health target uses `/api/v1/health`.
- `README.md` contains `Postgres/TimescaleDB`.
- `README.md` no longer contains raw-event-service HTTP links or the old compose sentence that included a deferred runtime service.
- `CLAUDE.md` no longer contains `Start services (` with a deferred runtime service.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` mark Phase 1 as complete.

## Deviations from Plan

The separate `../docs` repository was not modified. The only remaining mentions under `/home/zubarev/Projects/metraly/docs/tech/app` are historical superpowers cleanup specs/plans, not active default-runtime claims.

## Self-Check: PASSED

Phase 1 implementation satisfies FOUND-01 through FOUND-05 and leaves broader onboarding, ingestion, auth surface, AI, plugins, and Enterprise scope for later phases.
