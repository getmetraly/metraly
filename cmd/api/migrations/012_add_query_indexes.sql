-- Step 30 migration: add indexes required for activity_feed queries and
-- workspace-scoped metric queries.

-- Composite index for activity feed queries that filter by source_connection_id
-- and order by occurred_at DESC.  The activity feed handler issues:
--   WHERE source_connection_id IN (SELECT id FROM source_connections WHERE workspace_id = ?)
--   ORDER BY occurred_at DESC LIMIT N
-- This index supports both the inner-loop lookup and the final sort.
CREATE INDEX IF NOT EXISTS normalized_events_source_occurred_idx
    ON normalized_events(source_connection_id, occurred_at DESC);

-- Composite index for metric query repository methods that filter by event_type
-- and occurred_at range.  All six MetricQueryRepo methods issue:
--   WHERE event_type = '...' AND occurred_at >= $1 AND occurred_at < $2
-- Without this composite index the planner must scan the type index and then
-- filter by time, or scan the occurred_at index and filter by type.  The
-- composite makes the common access pattern a single range scan.
CREATE INDEX IF NOT EXISTS normalized_events_type_occurred_idx
    ON normalized_events(event_type, occurred_at DESC);

-- Composite index for per-source collector run listing ordered by start time.
-- The CollectorHandler.ListRuns handler issues:
--   WHERE source_connection_id = ? ORDER BY started_at DESC LIMIT N
-- The existing collector_runs_source_idx only supports the equality lookup.
CREATE INDEX IF NOT EXISTS collector_runs_source_started_idx
    ON collector_runs(source_connection_id, started_at DESC);
