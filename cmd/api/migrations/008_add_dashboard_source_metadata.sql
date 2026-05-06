ALTER TABLE dashboards
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'user-created',
    ADD COLUMN IF NOT EXISTS source_template_id TEXT REFERENCES dashboard_templates(id) ON DELETE SET NULL;

UPDATE dashboards
SET source_type = 'system-template',
    source_template_id = CASE id
        WHEN 'sandbox-overview' THEN 'overview'
        WHEN 'sandbox-cto' THEN 'cto'
        WHEN 'sandbox-vp' THEN 'vp'
        WHEN 'sandbox-tl' THEN 'tl'
        WHEN 'sandbox-devops' THEN 'devops'
        WHEN 'sandbox-ic' THEN 'ic'
        ELSE source_template_id
    END
WHERE id IN ('sandbox-overview', 'sandbox-cto', 'sandbox-vp', 'sandbox-tl', 'sandbox-devops', 'sandbox-ic');

UPDATE dashboards
SET source_type = 'forked'
WHERE forked_from_id IS NOT NULL AND source_type = 'user-created';
