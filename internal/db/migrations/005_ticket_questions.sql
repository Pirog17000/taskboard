CREATE TABLE IF NOT EXISTS questions (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    position    INTEGER DEFAULT 0,
    text        TEXT NOT NULL,
    answer      TEXT NOT NULL DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    answered_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_questions_ticket_id ON questions(ticket_id);
