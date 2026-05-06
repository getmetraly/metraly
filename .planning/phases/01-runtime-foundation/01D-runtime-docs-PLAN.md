---
phase: 1
phase_name: Runtime Foundation
plan: 01D-runtime-docs
type: execute
wave: 2
depends_on: [01A-runtime-wiring, 01C-license-headers]
requirements: [FOUND-01, FOUND-04, FOUND-05]
requirements_addressed: [FOUND-01, FOUND-04, FOUND-05]
files_modified:
  - Makefile
  - README.md
  - CLAUDE.md
  - ../docs/tech/app/BACKEND_PLAN.md
  - ../docs/tech/app/docs/architecture.md
  - ../docs/STATUS.md
  - .planning/STATE.md
  - .planning/ROADMAP.md
autonomous: true
---

# Plan 01D: Runtime Docs And Final Verification

<objective>
Make developer commands and retained app documentation accurately describe the Community Preview runtime: API, UI, Postgres/TimescaleDB, and Redis without any default dependency on a raw event store.
</objective>

<must_haves>
<truth id="D-04">Limit Phase 1 documentation cleanup to runtime mismatches that affect Community Preview truthfulness.</truth>
<truth id="D-05">Clean up default-stack drift in README.md, CLAUDE.md, Makefile, and moved app docs under ../docs/tech/app/ where those docs describe the current default runtime.</truth>
<truth id="D-06">Do not perform a broad honesty pass across all strategic docs in this phase; ../docs/STATUS.md remains canonical when docs disagree.</truth>
<truth id="D-15">Docker Compose smoke testing is useful but not mandatory for Phase 1 completion; document it as manual/local check if available.</truth>
</must_haves>

<threat_model>
Assets: developer onboarding instructions, Community Preview dependency boundary, canonical status.
Trust boundaries: documentation to developer actions, Makefile commands to local runtime.
Threats:
- Medium: docs or Makefile instruct developers to wait for or write to a missing raw-event service. Mitigation: remove the service from default commands and mark any future role as deferred only.
- Low: broad docs edits change investor/product commitments unintentionally. Mitigation: restrict edits to runtime mismatch claims only.
</threat_model>

<tasks>
<task id="01D-1" type="execute">
<title>Clean Makefile runtime commands</title>
<read_first>
- `Makefile`
- `docker-compose.yaml`
- `.planning/phases/01-runtime-foundation/01-CONTEXT.md`
</read_first>
<action>
Update `Makefile` to match the current compose stack:

1. In `run`, keep `REDIS_HOST=localhost REDIS_PORT=6379` and add `POSTGRES_DSN=postgres://metraly:metraly@localhost:5432/metraly?sslmode=disable`.
2. In `up`, remove any wait loop for a missing raw-event service. Replace it with a concise message listing `api`, `ui`, `postgres`, and `redis`, or a health check against `http://localhost:$(API_PORT)/api/v1/health` if reliable after Plan 01A.
3. Remove the old test-data target that wrote to a missing runtime service.
4. Change `health` target URLs from `/health` to `/api/v1/health`.
5. Remove the old test-data target from the help text.
</action>
<acceptance_criteria>
- `Makefile` does not contain a raw-event service hostname or the old test-data target.
- `Makefile` contains `/api/v1/health`.
- `make -n up` exits 0.
- `make -n health` exits 0.
</acceptance_criteria>
</task>

<task id="01D-2" type="execute">
<title>Update app README and CLAUDE runtime docs</title>
<read_first>
- `README.md`
- `CLAUDE.md`
- `docker-compose.yaml`
- `AGENTS.md`
- `../docs/STATUS.md`
</read_first>
<action>
Update only Community Preview runtime claims:

1. State that default Docker Compose starts API, UI, Postgres/TimescaleDB, and Redis.
2. Remove raw-event-service links from quickstart service references.
3. Remove or rewrite claims that default local data is stored in non-primary runtime tables.
4. Preserve future raw/dirty event ingestion only as deferred context feeding TimescaleDB aggregates.
5. Ensure license text says `AGPL-3.0-or-later` where SPDX precision is used.
6. In `CLAUDE.md`, change the start command note to a stack without any deferred runtime service.
</action>
<acceptance_criteria>
- `README.md` contains `Postgres/TimescaleDB`.
- `README.md` does not contain raw-event-service HTTP links.
- `README.md` does not contain the old "build and start" sentence that listed a deferred runtime service.
- `CLAUDE.md` does not contain `Start services (` with a deferred runtime service.
- `README.md` contains `AGPL-3.0-or-later` or links to `LICENSE` with AGPLv3 wording.
</acceptance_criteria>
</task>

<task id="01D-3" type="execute">
<title>Clean moved app docs runtime mismatch claims</title>
<read_first>
- `../docs/tech/app/BACKEND_PLAN.md`
- `../docs/tech/app/docs/architecture.md`
- `../docs/tech/app/docs/superpowers/specs/2026-05-03-infra-optimization-design.md`
- `../docs/tech/app/docs/superpowers/plans/2026-05-03-infra-optimization-plan.md`
- `../docs/STATUS.md`
</read_first>
<action>
Search moved app docs under `../docs/tech/app/` for default runtime claims about any deferred runtime service. Update only statements that say such a service is part of current/default compose or required Community Preview runtime.

Allowed final wording examples:

- `A deferred raw event store may be added later to feed curated TimescaleDB aggregates.`
- `Default local runtime: API, UI, Postgres/TimescaleDB, Redis.`

Do not rewrite broader strategic docs in `../docs/strategy`, `../docs/product`, or `../docs/investors`.
</action>
<acceptance_criteria>
- `rg -n "raw event store|deferred runtime service" ../docs/tech/app -g '*.md'` shows no line claiming a deferred runtime service is required in default compose or Community Preview runtime.
- Any remaining mentions under `../docs/tech/app` include `deferred`, `future`, `raw event`, or historical superpowers plan context.
</acceptance_criteria>
</task>

<task id="01D-4" type="execute">
<title>Final Phase 1 verification and planning status update</title>
<read_first>
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/01-runtime-foundation/01A-runtime-wiring-PLAN.md`
- `.planning/phases/01-runtime-foundation/01B-dashboard-handler-PLAN.md`
- `.planning/phases/01-runtime-foundation/01C-license-headers-PLAN.md`
- `.planning/phases/01-runtime-foundation/01D-runtime-docs-PLAN.md`
</read_first>
<action>
After Plans 01A, 01B, 01C, and 01D are implemented, run final verification:

```bash
go test ./...
go vet ./...
make -n up
make -n health
find . -path './.worktrees' -prune -o -name '*.go' -print | xargs -r awk 'FNR==1 && $0 !~ /^\/\/ SPDX-License-Identifier: AGPL-3.0-or-later$/ { print FILENAME }' | sort -u
rg -n "raw event store|deferred runtime service|old test data target" README.md CLAUDE.md Makefile ../docs/tech/app -g '*.md'
```

If Docker is available, optionally run:

```bash
make up
curl -f http://localhost:8000/api/v1/health
make down
```

Record whether Docker smoke was run in the phase summary. Do not fail Phase 1 solely because Docker is unavailable, unless code changes broke compose configuration.
</action>
<acceptance_criteria>
- `go test ./...` exits 0.
- `go vet ./...` exits 0.
- Header verification command prints no files.
- Search output contains no default-runtime requirement claims for any deferred runtime service.
- `.planning/STATE.md` can be updated to show Phase 1 ready for execution or completed after execute-phase.
</acceptance_criteria>
</task>
</tasks>

<verification>
Run:

```bash
go test ./...
go vet ./...
make -n up
make -n health
```
</verification>

<success_criteria>
- Default developer commands no longer imply a deferred runtime service is present.
- App docs describe the intended Community Preview runtime accurately.
- Phase 1 final verification gives clear proof for FOUND-01, FOUND-04, and FOUND-05.
</success_criteria>
