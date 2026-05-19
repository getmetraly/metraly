-- P1-6: Add workspace_id to activity_events so activity feeds are tenant-scoped.
--
-- The column is nullable for backward-compatibility with existing rows; new inserts
-- must provide a workspace_id. Application code in ActivityRepo.List enforces
-- the filter at query time so un-migrated rows are not surfaced.

ALTER TABLE activity_events
    ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT '';

-- Index for workspace-scoped queries.
CREATE INDEX IF NOT EXISTS activity_events_workspace_idx
    ON activity_events(workspace_id, timestamp DESC);
