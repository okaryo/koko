use rusqlite::Connection;

const MIGRATIONS: &[(u32, &str)] = &[
    (1, include_str!("../../migrations/001_initial.sql")),
    (
        2,
        include_str!("../../migrations/002_create_sticky_notes.sql"),
    ),
    (
        3,
        include_str!("../../migrations/003_add_sticky_note_position.sql"),
    ),
    (
        4,
        include_str!("../../migrations/004_add_sticky_note_color.sql"),
    ),
];

pub fn apply(connection: &mut Connection) -> Result<(), String> {
    let current_version = current_schema_version(connection)?;
    let mut previous_version = 0;

    for (version, sql) in MIGRATIONS {
        if *version <= previous_version {
            return Err(format!("Migration v{version} is out of order."));
        }

        previous_version = *version;

        if current_version >= *version {
            continue;
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Failed to start migration v{version}: {error}"))?;

        transaction
            .execute_batch(sql)
            .map_err(|error| format!("Failed to apply migration v{version}: {error}"))?;

        transaction
            .pragma_update(None, "user_version", version)
            .map_err(|error| format!("Failed to update schema version to v{version}: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Failed to commit migration v{version}: {error}"))?;
    }

    Ok(())
}

fn current_schema_version(connection: &Connection) -> Result<u32, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read schema version: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_pending_migrations() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        apply(&mut connection).expect("apply migrations");

        let version: u32 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        let (daily_notes_table_count, sticky_notes_table_count): (u32, u32) = connection
            .query_row(
                "
                SELECT
                    SUM(name = 'daily_notes'),
                    SUM(name = 'sticky_notes')
                FROM sqlite_schema
                WHERE type = 'table'
                  AND name IN ('daily_notes', 'sticky_notes')
                ",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("read table counts");

        assert_eq!(version, 4);
        assert_eq!(daily_notes_table_count, 1);
        assert_eq!(sticky_notes_table_count, 1);
    }

    #[test]
    fn migrations_are_idempotent() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        apply(&mut connection).expect("apply migrations");
        connection
            .execute(
                "
                INSERT INTO daily_notes (note_date, body_html, created_at_ms, updated_at_ms)
                VALUES ('2026-06-26', '<p>Existing</p>', 1000, 1000)
                ",
                [],
            )
            .expect("insert existing DailyNote");

        apply(&mut connection).expect("reapply migrations");

        let version: u32 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        let daily_note_count: u32 = connection
            .query_row("SELECT COUNT(*) FROM daily_notes", [], |row| row.get(0))
            .expect("read daily note count");

        assert_eq!(version, 4);
        assert_eq!(daily_note_count, 1);
    }

    #[test]
    fn preserves_existing_sticky_note_order_when_adding_positions() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        connection
            .execute_batch(MIGRATIONS[0].1)
            .expect("apply initial migration");
        connection
            .execute_batch(MIGRATIONS[1].1)
            .expect("apply StickyNote migration");
        connection
            .execute_batch(
                "
                INSERT INTO sticky_notes
                    (body, created_at_ms, updated_at_ms, pinned_at_ms, archived_at_ms)
                VALUES
                    ('Unpinned older', 1000, 1000, NULL, NULL),
                    ('Pinned older', 2000, 3000, 3000, NULL),
                    ('Unpinned newer', 4000, 4000, NULL, NULL),
                    ('Pinned newer', 1500, 5000, 5000, NULL),
                    ('Archived', 6000, 7000, NULL, 7000);
                PRAGMA user_version = 2;
                ",
            )
            .expect("insert v2 StickyNotes");

        apply(&mut connection).expect("apply position migration");

        let sticky_notes = connection
            .prepare(
                "
                SELECT body, position
                FROM sticky_notes
                WHERE archived_at_ms IS NULL
                ORDER BY pinned_at_ms IS NULL ASC, position ASC, id ASC
                ",
            )
            .expect("prepare StickyNote order query")
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })
            .expect("query migrated StickyNotes")
            .collect::<Result<Vec<_>, _>>()
            .expect("read migrated StickyNotes");

        assert_eq!(
            sticky_notes,
            vec![
                ("Pinned newer".to_string(), 0),
                ("Pinned older".to_string(), 1),
                ("Unpinned newer".to_string(), 0),
                ("Unpinned older".to_string(), 1),
            ]
        );
    }

    #[test]
    fn gives_existing_sticky_notes_the_default_color() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        for (_, migration) in &MIGRATIONS[..3] {
            connection
                .execute_batch(migration)
                .expect("apply migration before StickyNote colors");
        }
        connection
            .execute(
                "
                INSERT INTO sticky_notes
                    (body, created_at_ms, updated_at_ms, pinned_at_ms, position, archived_at_ms)
                VALUES ('Existing', 1000, 1000, NULL, 0, NULL)
                ",
                [],
            )
            .expect("insert existing StickyNote");
        connection
            .pragma_update(None, "user_version", 3)
            .expect("set schema version");

        apply(&mut connection).expect("apply StickyNote color migration");

        let color: String = connection
            .query_row(
                "SELECT color FROM sticky_notes WHERE body = 'Existing'",
                [],
                |row| row.get(0),
            )
            .expect("read migrated StickyNote color");

        assert_eq!(color, "yellow");
    }
}
