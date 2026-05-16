-- Source connections registry
CREATE TABLE IF NOT EXISTS source_connections (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    source_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_configured',
    config JSONB NOT NULL DEFAULT '{}',
    credential_id TEXT,
    last_tested_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS source_connections_workspace_idx ON source_connections(workspace_id);
CREATE INDEX IF NOT EXISTS source_connections_status_idx ON source_connections(status);

CREATE TABLE IF NOT EXISTS credential_refs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    source_type TEXT NOT NULL,
    kind TEXT NOT NULL,
    hint TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    encrypted_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credential_refs_workspace_idx ON credential_refs(workspace_id);

CREATE TABLE IF NOT EXISTS collector_runs (
    id TEXT PRIMARY KEY,
    source_connection_id TEXT NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
    collector_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'started',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    cursor TEXT NOT NULL DEFAULT '',
    raw_event_count BIGINT NOT NULL DEFAULT 0,
    error_category TEXT NOT NULL DEFAULT '',
    error_message TEXT NOT NULL DEFAULT '',
    rate_limit_state TEXT NOT NULL DEFAULT 'ok',
    retry_after TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collector_runs_source_idx ON collector_runs(source_connection_id);
CREATE INDEX IF NOT EXISTS collector_runs_status_idx ON collector_runs(status);
CREATE INDEX IF NOT EXISTS collector_runs_started_at_idx ON collector_runs(started_at DESC);
