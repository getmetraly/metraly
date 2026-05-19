-- P1-3: Add schema constraints to prevent invalid data from entering the source registry.
--
-- PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS, so each constraint
-- is wrapped in a DO block that catches duplicate_object exceptions.

-- 1. CHECK constraint: source_connections.source_type must be a known value.
DO $$
BEGIN
    ALTER TABLE source_connections
        ADD CONSTRAINT source_connections_source_type_check
        CHECK (source_type IN (
            'github', 'github_actions', 'jira', 'gitlab', 'linear', 'prometheus'
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. CHECK constraint: source_connections.status must be a known value.
DO $$
BEGIN
    ALTER TABLE source_connections
        ADD CONSTRAINT source_connections_status_check
        CHECK (status IN (
            'not_configured', 'pending', 'testing', 'ready',
            'syncing', 'degraded', 'auth_failed', 'rate_limited',
            'disabled', 'deleted'
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. FK constraint: source_connections.credential_id must reference credential_refs.
--    ON DELETE SET NULL so deleting a credential doesn't cascade-delete the source.
DO $$
BEGIN
    ALTER TABLE source_connections
        ADD CONSTRAINT source_connections_credential_fk
        FOREIGN KEY (credential_id) REFERENCES credential_refs(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. CHECK constraint: credential_refs.source_type must be a known value.
DO $$
BEGIN
    ALTER TABLE credential_refs
        ADD CONSTRAINT credential_refs_source_type_check
        CHECK (source_type IN (
            'github', 'github_actions', 'jira', 'gitlab', 'linear', 'prometheus'
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. CHECK constraint: credential_refs.kind must be a known value.
DO $$
BEGIN
    ALTER TABLE credential_refs
        ADD CONSTRAINT credential_refs_kind_check
        CHECK (kind IN ('pat', 'api_token', 'oauth'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. CHECK constraint: collector_runs.status must be a known value.
DO $$
BEGIN
    ALTER TABLE collector_runs
        ADD CONSTRAINT collector_runs_status_check
        CHECK (status IN (
            'started', 'running', 'succeeded', 'failed', 'cancelled'
        ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
