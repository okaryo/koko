use rusqlite::Connection;

const MIGRATIONS: &[(u32, &str)] = &[
    (1, include_str!("../../migrations/001_initial.sql")),
    (
        2,
        include_str!("../../migrations/002_create_sticky_notes.sql"),
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

        assert_eq!(version, 2);
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

        assert_eq!(version, 2);
        assert_eq!(daily_note_count, 1);
    }
}
