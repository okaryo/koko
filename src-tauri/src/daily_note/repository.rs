use super::model::{DailyNote, DailyNoteNavigation};
use rusqlite::{params, Connection, OptionalExtension};

pub fn get_or_create(
    connection: &Connection,
    note_date: &str,
    now_ms: i64,
) -> Result<DailyNote, String> {
    if let Some(daily_note) = find_by_date(connection, note_date)? {
        return Ok(daily_note);
    }

    connection
        .execute(
            "
            INSERT INTO daily_notes (note_date, body_html, created_at_ms, updated_at_ms)
            VALUES (?1, '', ?2, ?2)
            ",
            params![note_date, now_ms],
        )
        .map_err(|error| format!("Failed to create DailyNote: {error}"))?;

    find_by_date(connection, note_date)?
        .ok_or_else(|| "Failed to load created DailyNote.".to_string())
}

pub fn get(connection: &Connection, note_date: &str) -> Result<Option<DailyNote>, String> {
    find_by_date(connection, note_date)
}

pub fn navigation(connection: &Connection, note_date: &str) -> Result<DailyNoteNavigation, String> {
    let previous_note_date = connection
        .query_row(
            "
            SELECT note_date
            FROM daily_notes
            WHERE note_date < ?1
            ORDER BY note_date DESC
            LIMIT 1
            ",
            params![note_date],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Failed to query previous DailyNote: {error}"))?;
    let next_note_date = connection
        .query_row(
            "
            SELECT note_date
            FROM daily_notes
            WHERE note_date > ?1
            ORDER BY note_date ASC
            LIMIT 1
            ",
            params![note_date],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Failed to query next DailyNote: {error}"))?;

    Ok(DailyNoteNavigation {
        previous_note_date,
        next_note_date,
    })
}

pub fn update_body(
    connection: &Connection,
    id: u32,
    body_html: &str,
    updated_at_ms: i64,
) -> Result<DailyNote, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE daily_notes
            SET body_html = ?1,
                updated_at_ms = ?2
            WHERE id = ?3
            ",
            params![body_html, updated_at_ms, id],
        )
        .map_err(|error| format!("Failed to update DailyNote: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("DailyNote {id} was not found."));
    }

    find_by_id(connection, id)?.ok_or_else(|| format!("DailyNote {id} was not found."))
}

fn find_by_date(connection: &Connection, note_date: &str) -> Result<Option<DailyNote>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, note_date, body_html, created_at_ms, updated_at_ms
            FROM daily_notes
            WHERE note_date = ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare DailyNote lookup: {error}"))?;
    let mut rows = statement
        .query(params![note_date])
        .map_err(|error| format!("Failed to query DailyNote: {error}"))?;

    if let Some(row) = rows
        .next()
        .map_err(|error| format!("Failed to read DailyNote row: {error}"))?
    {
        return Ok(Some(DailyNote {
            id: row
                .get(0)
                .map_err(|error| format!("Failed to read DailyNote id: {error}"))?,
            note_date: row
                .get(1)
                .map_err(|error| format!("Failed to read DailyNote date: {error}"))?,
            body_html: row
                .get(2)
                .map_err(|error| format!("Failed to read DailyNote body: {error}"))?,
            created_at_ms: row
                .get(3)
                .map_err(|error| format!("Failed to read DailyNote created time: {error}"))?,
            updated_at_ms: row
                .get(4)
                .map_err(|error| format!("Failed to read DailyNote updated time: {error}"))?,
        }));
    }

    Ok(None)
}

fn find_by_id(connection: &Connection, id: u32) -> Result<Option<DailyNote>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, note_date, body_html, created_at_ms, updated_at_ms
            FROM daily_notes
            WHERE id = ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare DailyNote lookup: {error}"))?;
    let mut rows = statement
        .query(params![id])
        .map_err(|error| format!("Failed to query DailyNote: {error}"))?;

    if let Some(row) = rows
        .next()
        .map_err(|error| format!("Failed to read DailyNote row: {error}"))?
    {
        return Ok(Some(DailyNote {
            id: row
                .get(0)
                .map_err(|error| format!("Failed to read DailyNote id: {error}"))?,
            note_date: row
                .get(1)
                .map_err(|error| format!("Failed to read DailyNote date: {error}"))?,
            body_html: row
                .get(2)
                .map_err(|error| format!("Failed to read DailyNote body: {error}"))?,
            created_at_ms: row
                .get(3)
                .map_err(|error| format!("Failed to read DailyNote created time: {error}"))?,
            updated_at_ms: row
                .get(4)
                .map_err(|error| format!("Failed to read DailyNote updated time: {error}"))?,
        }));
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_support::migrated_connection;

    #[test]
    fn creates_daily_note_when_missing() {
        let connection = migrated_connection();

        let daily_note = get_or_create(&connection, "2026-06-26", 1000).expect("get or create");

        assert_eq!(daily_note.note_date, "2026-06-26");
        assert_eq!(daily_note.body_html, "");
        assert_eq!(daily_note.created_at_ms, 1000);
        assert_eq!(daily_note.updated_at_ms, 1000);
    }

    #[test]
    fn reuses_existing_daily_note() {
        let connection = migrated_connection();

        let first = get_or_create(&connection, "2026-06-26", 1000).expect("create");
        let second = get_or_create(&connection, "2026-06-26", 2000).expect("reuse");

        assert_eq!(second.id, first.id);
        assert_eq!(second.created_at_ms, 1000);
        assert_eq!(second.updated_at_ms, 1000);
    }

    #[test]
    fn updates_daily_note_body() {
        let connection = migrated_connection();
        let daily_note = get_or_create(&connection, "2026-06-26", 1000).expect("create");

        let updated =
            update_body(&connection, daily_note.id, "<p>Updated</p>", 2000).expect("update");

        assert_eq!(updated.body_html, "<p>Updated</p>");
        assert_eq!(updated.updated_at_ms, 2000);
    }

    #[test]
    fn gets_daily_note_navigation() {
        let connection = migrated_connection();
        get_or_create(&connection, "2026-06-25", 1000).expect("create older");
        get_or_create(&connection, "2026-06-27", 2000).expect("create active");
        get_or_create(&connection, "2026-06-29", 3000).expect("create newer");

        let navigation = navigation(&connection, "2026-06-27").expect("get navigation");

        assert_eq!(
            navigation.previous_note_date,
            Some("2026-06-25".to_string())
        );
        assert_eq!(navigation.next_note_date, Some("2026-06-29".to_string()));
    }

    #[test]
    fn gets_no_navigation_when_adjacent_daily_notes_do_not_exist() {
        let connection = migrated_connection();
        get_or_create(&connection, "2026-06-27", 1000).expect("create active");

        let navigation = navigation(&connection, "2026-06-27").expect("get navigation");

        assert_eq!(navigation.previous_note_date, None);
        assert_eq!(navigation.next_note_date, None);
    }
}
