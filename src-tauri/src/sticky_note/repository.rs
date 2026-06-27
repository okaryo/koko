use super::model::StickyNote;
use rusqlite::{params, Connection};

pub fn list_active(connection: &Connection) -> Result<Vec<StickyNote>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, body, created_at_ms, updated_at_ms, archived_at_ms
            FROM sticky_notes
            WHERE archived_at_ms IS NULL
            ORDER BY created_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| format!("Failed to prepare StickyNote list query: {error}"))?;

    let sticky_notes = statement
        .query_map([], row_to_sticky_note)
        .map_err(|error| format!("Failed to query StickyNotes: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read StickyNotes: {error}"))?;

    Ok(sticky_notes)
}

pub fn create(connection: &Connection, body: &str, now_ms: i64) -> Result<StickyNote, String> {
    connection
        .execute(
            "
            INSERT INTO sticky_notes (body, created_at_ms, updated_at_ms, archived_at_ms)
            VALUES (?1, ?2, ?2, NULL)
            ",
            params![body, now_ms],
        )
        .map_err(|error| format!("Failed to create StickyNote: {error}"))?;

    let id = connection.last_insert_rowid() as u32;

    find_by_id(connection, id)?.ok_or_else(|| "Failed to load created StickyNote.".to_string())
}

pub fn update_body(
    connection: &Connection,
    id: u32,
    body: &str,
    now_ms: i64,
) -> Result<StickyNote, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE sticky_notes
            SET body = ?1,
                updated_at_ms = ?2
            WHERE id = ?3
              AND archived_at_ms IS NULL
            ",
            params![body, now_ms, id],
        )
        .map_err(|error| format!("Failed to update StickyNote: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("Active StickyNote {id} was not found."));
    }

    find_by_id(connection, id)?.ok_or_else(|| format!("StickyNote {id} was not found."))
}

pub fn archive(connection: &Connection, id: u32, now_ms: i64) -> Result<StickyNote, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE sticky_notes
            SET archived_at_ms = ?1,
                updated_at_ms = ?1
            WHERE id = ?2
              AND archived_at_ms IS NULL
            ",
            params![now_ms, id],
        )
        .map_err(|error| format!("Failed to archive StickyNote: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("Active StickyNote {id} was not found."));
    }

    find_by_id(connection, id)?.ok_or_else(|| format!("StickyNote {id} was not found."))
}

fn find_by_id(connection: &Connection, id: u32) -> Result<Option<StickyNote>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, body, created_at_ms, updated_at_ms, archived_at_ms
            FROM sticky_notes
            WHERE id = ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare StickyNote lookup: {error}"))?;
    let mut rows = statement
        .query(params![id])
        .map_err(|error| format!("Failed to query StickyNote: {error}"))?;

    if let Some(row) = rows
        .next()
        .map_err(|error| format!("Failed to read StickyNote row: {error}"))?
    {
        return row_to_sticky_note(row)
            .map(Some)
            .map_err(|error| format!("Failed to read StickyNote: {error}"));
    }

    Ok(None)
}

fn row_to_sticky_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<StickyNote> {
    Ok(StickyNote {
        id: row.get(0)?,
        body: row.get(1)?,
        created_at_ms: row.get(2)?,
        updated_at_ms: row.get(3)?,
        archived_at_ms: row.get(4)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_support::migrated_connection;

    #[test]
    fn creates_sticky_note() {
        let connection = migrated_connection();

        let sticky_note = create(&connection, "Remember this", 1000).expect("create sticky note");

        assert_eq!(sticky_note.body, "Remember this");
        assert_eq!(sticky_note.created_at_ms, 1000);
        assert_eq!(sticky_note.updated_at_ms, 1000);
        assert_eq!(sticky_note.archived_at_ms, None);
    }

    #[test]
    fn lists_only_active_sticky_notes_newest_first() {
        let connection = migrated_connection();
        let older = create(&connection, "Older", 1000).expect("create older sticky note");
        let newer = create(&connection, "Newer", 2000).expect("create newer sticky note");

        archive(&connection, older.id, 3000).expect("archive older sticky note");

        let sticky_notes = list_active(&connection).expect("list sticky notes");

        assert_eq!(sticky_notes.len(), 1);
        assert_eq!(sticky_notes[0].id, newer.id);
    }

    #[test]
    fn archives_sticky_note() {
        let connection = migrated_connection();
        let sticky_note = create(&connection, "Archive me", 1000).expect("create sticky note");

        let archived = archive(&connection, sticky_note.id, 2000).expect("archive sticky note");

        assert_eq!(archived.archived_at_ms, Some(2000));
        assert_eq!(archived.updated_at_ms, 2000);
    }

    #[test]
    fn updates_sticky_note_body() {
        let connection = migrated_connection();
        let sticky_note = create(&connection, "Before", 1000).expect("create sticky note");

        let updated =
            update_body(&connection, sticky_note.id, "After", 2000).expect("update sticky note");

        assert_eq!(updated.body, "After");
        assert_eq!(updated.updated_at_ms, 2000);
        assert_eq!(updated.archived_at_ms, None);
    }
}
