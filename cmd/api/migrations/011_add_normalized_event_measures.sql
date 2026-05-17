-- Add measure columns needed for MVP metric computation.
--
-- conclusion: workflow/deployment outcome (success|failure|cancelled|unknown).
--   Used to compute build_failure_rate without joining raw_source_events.
--
-- points_completed / points_planned: sprint story-point measures.
--   Used to compute sprint_predictability. NULL on all non-sprint events.

ALTER TABLE normalized_events
    ADD COLUMN IF NOT EXISTS conclusion       TEXT,
    ADD COLUMN IF NOT EXISTS points_completed BIGINT,
    ADD COLUMN IF NOT EXISTS points_planned   BIGINT;

-- Partial index for build_failure_rate queries (only workflow_run.completed rows matter).
CREATE INDEX IF NOT EXISTS normalized_events_conclusion_idx
    ON normalized_events(event_type, conclusion)
    WHERE conclusion IS NOT NULL;
