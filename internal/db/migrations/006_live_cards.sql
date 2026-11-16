ALTER TABLE tickets ADD COLUMN kind TEXT;
ALTER TABLE tickets ADD COLUMN live_id TEXT;
ALTER TABLE tickets ADD COLUMN progress INTEGER;
ALTER TABLE tickets ADD COLUMN progress_text TEXT;
ALTER TABLE tickets ADD COLUMN live_state TEXT;
ALTER TABLE tickets ADD COLUMN live_lines TEXT;
ALTER TABLE tickets ADD COLUMN expires_at DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_live_id ON tickets(project_id, live_id) WHERE live_id IS NOT NULL;
