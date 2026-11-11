CREATE TABLE IF NOT EXISTS ticket_fields (
    ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
    key       TEXT NOT NULL,
    value     TEXT NOT NULL,
    PRIMARY KEY (ticket_id, key)
);

CREATE INDEX IF NOT EXISTS idx_ticket_dependencies_blocked_by_id ON ticket_dependencies(blocked_by_id);
