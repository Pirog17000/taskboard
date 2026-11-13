CREATE TABLE IF NOT EXISTS ticket_links (
    from_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    to_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    type    TEXT NOT NULL CHECK (type IN ('relates_to', 'duplicates')),
    PRIMARY KEY (from_id, to_id, type),
    CHECK (from_id <> to_id),
    CHECK (type <> 'relates_to' OR from_id < to_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_links_to_id ON ticket_links(to_id);
