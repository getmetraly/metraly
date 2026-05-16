-- Raw source events: boundary contract for events from external sources.
-- Payload is minimized: personal/free-form text (commit messages, issue titles, PR body)
-- MUST NOT be stored. Only structural fields needed for metric computation are kept.
CREATE TABLE IF NOT EXISTS raw_source_events (
    id                  TEXT        PRIMARY KEY,
    source_connection_id TEXT       NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
    collector_run_id    TEXT        NOT NULL REFERENCES collector_runs(id) ON DELETE CASCADE,
    source_type         TEXT        NOT NULL,
    external_id         TEXT        NOT NULL,
    event_type          TEXT        NOT NULL,
    -- payload_hash: SHA-256 of the normalized payload for deduplication and audit.
    payload_hash        TEXT        NOT NULL,
    -- deduplication_key: source_type:external_id:event_type:source_updated_at
    -- Unique per workspace to prevent cross-source collision.
    deduplication_key   TEXT        NOT NULL,
    -- payload: minimized structural fields only. No free-form text.
    payload             JSONB       NOT NULL DEFAULT '{}',
    schema_version      INT         NOT NULL DEFAULT 1,
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_updated_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uniqueness on deduplication_key scoped to source_connection_id prevents duplicates
-- across restarts, retries, and incremental syncs.
CREATE UNIQUE INDEX IF NOT EXISTS raw_source_events_dedup_idx
    ON raw_source_events(source_connection_id, deduplication_key);

CREATE INDEX IF NOT EXISTS raw_source_events_run_idx
    ON raw_source_events(collector_run_id);
CREATE INDEX IF NOT EXISTS raw_source_events_type_idx
    ON raw_source_events(source_type, event_type);
CREATE INDEX IF NOT EXISTS raw_source_events_received_idx
    ON raw_source_events(received_at DESC);

-- Normalized events: canonical, source-agnostic engineering events.
-- Produced by the normalizer from raw_source_events.
CREATE TABLE IF NOT EXISTS normalized_events (
    id                   TEXT        PRIMARY KEY,
    raw_source_event_id  TEXT        NOT NULL REFERENCES raw_source_events(id) ON DELETE CASCADE,
    source_connection_id TEXT        NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
    event_type           TEXT        NOT NULL,  -- NormalizedEventType enum value
    entity_kind          TEXT        NOT NULL,  -- pull_request | workflow_run | issue | sprint | deployment
    entity_id            TEXT        NOT NULL,

    -- Dimensions (resolved at normalization time)
    repository_id        TEXT        NOT NULL DEFAULT '',
    team_id              TEXT        NOT NULL DEFAULT '',
    author_id            TEXT        NOT NULL DEFAULT '',  -- resolved IdentityMapping.id or ''
    reviewer_id          TEXT        NOT NULL DEFAULT '',  -- resolved IdentityMapping.id or ''
    author_unresolved    BOOLEAN     NOT NULL DEFAULT FALSE,  -- true when author_id could not be resolved
    reviewer_unresolved  BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Timestamps
    occurred_at          TIMESTAMPTZ NOT NULL,
    received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Measures (non-null only for completed events where metric applies)
    cycle_time_seconds      BIGINT,   -- PR open → merge
    review_latency_seconds  BIGINT,   -- review_requested → first review_submitted
    duration_seconds        BIGINT,   -- workflow/deployment duration

    schema_version       INT         NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS normalized_events_raw_idx
    ON normalized_events(raw_source_event_id);
CREATE INDEX IF NOT EXISTS normalized_events_entity_idx
    ON normalized_events(entity_kind, entity_id);
CREATE INDEX IF NOT EXISTS normalized_events_occurred_idx
    ON normalized_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS normalized_events_type_idx
    ON normalized_events(event_type);

-- Identity mappings: source identity → internal user/team mapping.
-- External emails MUST NOT be stored in plaintext. Use SHA-256 hash only.
CREATE TABLE IF NOT EXISTS identity_mappings (
    id                  TEXT        PRIMARY KEY,
    workspace_id        TEXT        NOT NULL DEFAULT 'default',
    source_type         TEXT        NOT NULL,
    external_id         TEXT        NOT NULL,  -- source system user ID
    external_login      TEXT        NOT NULL DEFAULT '',  -- GitHub login, Jira displayName
    external_email_hash TEXT        NOT NULL DEFAULT '',  -- SHA-256(email), never plaintext
    user_id             TEXT        NOT NULL DEFAULT '',  -- internal user id if mapped
    team_id             TEXT        NOT NULL DEFAULT '',  -- internal team id if mapped
    confidence          FLOAT8      NOT NULL DEFAULT 0.0, -- 0.0 = unresolved, 1.0 = exact match
    status              TEXT        NOT NULL DEFAULT 'unresolved', -- mapped|unresolved|ignored|conflict
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_mappings_source_idx
    ON identity_mappings(workspace_id, source_type, external_id);
CREATE INDEX IF NOT EXISTS identity_mappings_status_idx
    ON identity_mappings(workspace_id, status);
CREATE INDEX IF NOT EXISTS identity_mappings_login_idx
    ON identity_mappings(workspace_id, external_login);
