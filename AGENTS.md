# AGENTS.md

This file documents agent-specific information for this project.

## Worktrees

All feature work should be done in a **project‑local Git worktree** located under the hidden `.worktrees/` directory. Example workflow:

```bash
# Create a new worktree for a feature branch
git worktree add .worktrees/feature‑xyz feature/xyz
cd .worktrees/feature‑xyz
```

The worktree stays isolated from the main workspace, making it safe to run `make docker-restart` or other heavy commands without affecting other branches.

## Project Context

- **Name**: Metraly — Team Engineering Metrics API
- **Language**: Go (backend), React (frontend)
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis

## Phase Planning Rule

Before starting any phase-planning work, read the relevant documentation under `../docs/` first. Treat `../docs/STATUS.md` and the supporting status/product/architecture files there as the source of truth for planning inputs, and only then move into roadmap or plan generation.

## Issue Tracker

- **Type**: Markdown files in ../docs/
- **Labels**: Plans, Specs
- **Format**: YYYY-MM-DD-{name}-{type}.md


## Common Commands

```bash
# Development
make build              # Build API
make test               # Run tests
make lint               # Run linter
make run                # Run locally

# Docker
make docker-up          # Start services
make docker-down        # Stop services
make docker-restart     # Restart services

# Debugging
make health             # Check API health
make dashboard          # Check dashboard data
make docker-logs         # View logsa

# Data
make docker-test-data   # Insert test data

## Testing Strategy

- Unit tests in *_test.go files next to implementation
- Mock interfaces for dependencies
- Run: `make test` (19 tests)

## Code Style

- Go: idiomatic, interfaces for dependencies, context.Context for all I/O
- Tests: table-driven where appropriate, clear mock implementations

## UI Design Notes

- For onboarding and first-run choice screens, prefer the `DashboardWizardScreen` selection pattern over native radio controls.
- Selection rows should be compact card-like items with left icon, center text, and a right-side selected indicator.
- Keep hover behavior restrained: change border/background only, avoid vertical movement on selectable rows.
- Put explanatory badges or microcopy inside the selectable row when they describe that specific option.
- Place primary continuation actions below the option container unless the screen explicitly mirrors an existing wizard footer.
- Use `WizardScreen`, `DashboardWizardScreen`, `PluginScreen`, and `AIInsightCard` as local style references before introducing new interaction patterns.

## Domain Mapping Rule

- Do not encode metric metadata, units, labels, or similar domain catalog data in large `switch` blocks.
- Prefer a registry or descriptor table with small resolver helpers, or a strategy object when behavior varies by metric.
- Keep fallback formatting in a single helper so new metric IDs can be added without editing multiple branches.

## Dispatch Rule

- For large `switch`/`case` blocks that select behavior, handlers, processors, commands, or strategies, prefer a Factory/Registry wrapper over a map.
- Keep small `switch` statements with up to 5 simple cases when they are clearer than a registry.
- Do not refactor dispatch mechanically; only replace it when extensibility, testability, or separation of concerns clearly improves.
- Always handle unsupported keys or types explicitly, with an error or a domain-specific fallback.
- Keep registry registration centralized, predictable, and testable.
- In Go, protect runtime registry mutation with `sync.RWMutex` or use immutable startup registration.
- In TypeScript, prefer immutable startup registration and avoid hidden mutation during request handling.

## Local Auth Rule

- For local compose and preview environments, prefer a seeded admin account plus a real login gate over client-side 401 bypasses.
- If auth is required for preview data, the fallback should be an explicit sign-in screen or seeded local session, not hidden API mocking.

## License Requirements

- **License**: GNU AGPLv3 – every Go source file must start with the SPDX‑AGPL‑3.0‑or‑later header.
- **Header text (exactly as required):**
  ```go
  // SPDX-License-Identifier: AGPL-3.0-or-later
  // Metraly - Team Engineering Metrics API
  // Copyright (C) 2026 Metraly Contributors
  ```
- **When adding a new `.go` file** – insert the header at the very top of the file before the `package` clause.
- **Existing files** – must already contain the header; if any are missing, add it.
- **Swagger docs** – include the license line `// @license AGPL-3.0-or-later` in `cmd/api/main.go`.
