-- P1-1: Enforce at most one active (started or running) collector run per source
-- at the database level. The partial unique index makes the constraint atomic
-- under concurrent INSERT, preventing two simultaneous triggers from both
-- succeeding even if the application-level check races.
--
-- The application still checks for an active run before INSERT (see CollectorSvc.Run)
-- but cannot guarantee atomicity alone; this index is the authoritative guard.

CREATE UNIQUE INDEX IF NOT EXISTS collector_runs_one_active_per_source_idx
ON collector_runs(source_connection_id)
WHERE status IN ('started', 'running');
