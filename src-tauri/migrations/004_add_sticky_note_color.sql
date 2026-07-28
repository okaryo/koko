ALTER TABLE sticky_notes
ADD COLUMN color TEXT NOT NULL DEFAULT 'yellow'
CHECK (color IN ('yellow', 'pink', 'blue', 'green'));
