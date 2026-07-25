ALTER TABLE sticky_notes
ADD COLUMN position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0);

WITH ranked_sticky_notes AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY pinned_at_ms IS NULL
            ORDER BY pinned_at_ms DESC, created_at_ms DESC, id DESC
        ) - 1 AS next_position
    FROM sticky_notes
    WHERE archived_at_ms IS NULL
)
UPDATE sticky_notes
SET position = (
    SELECT next_position
    FROM ranked_sticky_notes
    WHERE ranked_sticky_notes.id = sticky_notes.id
)
WHERE archived_at_ms IS NULL;

DROP INDEX idx_sticky_notes_active_order;

CREATE INDEX idx_sticky_notes_active_order ON sticky_notes (
    archived_at_ms,
    (pinned_at_ms IS NULL),
    position,
    id
);
