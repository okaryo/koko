CREATE TABLE pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    archived_at_ms INTEGER
);

CREATE INDEX idx_pins_active_created_at ON pins (archived_at_ms, created_at_ms);
