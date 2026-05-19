-- P1-19: Wrap CREATE TYPE in an idempotent DO block so re-runs after a partial
-- failure do not error with "type already exists".
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM ('deploy', 'alert', 'review', 'merge');
EXCEPTION WHEN duplicate_object THEN
    NULL; -- type already exists; no action needed
END $$;

CREATE TABLE IF NOT EXISTS activity_events (
    id          TEXT PRIMARY KEY,
    type        activity_type NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name   TEXT NOT NULL DEFAULT '',
    user_avatar TEXT NOT NULL DEFAULT ''
);
