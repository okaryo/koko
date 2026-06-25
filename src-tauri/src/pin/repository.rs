use super::model::Pin;
use rusqlite::{params, Connection};

pub fn list_active(connection: &Connection) -> Result<Vec<Pin>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, body, created_at_ms, updated_at_ms, archived_at_ms
            FROM pins
            WHERE archived_at_ms IS NULL
            ORDER BY created_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| format!("Failed to prepare Pin list query: {error}"))?;

    let pins = statement
        .query_map([], row_to_pin)
        .map_err(|error| format!("Failed to query Pins: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read Pins: {error}"))?;

    Ok(pins)
}

pub fn create(connection: &Connection, body: &str, now_ms: i64) -> Result<Pin, String> {
    connection
        .execute(
            "
            INSERT INTO pins (body, created_at_ms, updated_at_ms, archived_at_ms)
            VALUES (?1, ?2, ?2, NULL)
            ",
            params![body, now_ms],
        )
        .map_err(|error| format!("Failed to create Pin: {error}"))?;

    let id = connection.last_insert_rowid() as u32;

    find_by_id(connection, id)?.ok_or_else(|| "Failed to load created Pin.".to_string())
}

pub fn update_body(
    connection: &Connection,
    id: u32,
    body: &str,
    now_ms: i64,
) -> Result<Pin, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE pins
            SET body = ?1,
                updated_at_ms = ?2
            WHERE id = ?3
              AND archived_at_ms IS NULL
            ",
            params![body, now_ms, id],
        )
        .map_err(|error| format!("Failed to update Pin: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("Active Pin {id} was not found."));
    }

    find_by_id(connection, id)?.ok_or_else(|| format!("Pin {id} was not found."))
}

pub fn archive(connection: &Connection, id: u32, now_ms: i64) -> Result<Pin, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE pins
            SET archived_at_ms = ?1,
                updated_at_ms = ?1
            WHERE id = ?2
              AND archived_at_ms IS NULL
            ",
            params![now_ms, id],
        )
        .map_err(|error| format!("Failed to archive Pin: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("Active Pin {id} was not found."));
    }

    find_by_id(connection, id)?.ok_or_else(|| format!("Pin {id} was not found."))
}

fn find_by_id(connection: &Connection, id: u32) -> Result<Option<Pin>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, body, created_at_ms, updated_at_ms, archived_at_ms
            FROM pins
            WHERE id = ?1
            ",
        )
        .map_err(|error| format!("Failed to prepare Pin lookup: {error}"))?;
    let mut rows = statement
        .query(params![id])
        .map_err(|error| format!("Failed to query Pin: {error}"))?;

    if let Some(row) = rows
        .next()
        .map_err(|error| format!("Failed to read Pin row: {error}"))?
    {
        return row_to_pin(row)
            .map(Some)
            .map_err(|error| format!("Failed to read Pin: {error}"));
    }

    Ok(None)
}

fn row_to_pin(row: &rusqlite::Row<'_>) -> rusqlite::Result<Pin> {
    Ok(Pin {
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
    fn creates_pin() {
        let connection = migrated_connection();

        let pin = create(&connection, "Remember this", 1000).expect("create pin");

        assert_eq!(pin.body, "Remember this");
        assert_eq!(pin.created_at_ms, 1000);
        assert_eq!(pin.updated_at_ms, 1000);
        assert_eq!(pin.archived_at_ms, None);
    }

    #[test]
    fn lists_only_active_pins_newest_first() {
        let connection = migrated_connection();
        let older = create(&connection, "Older", 1000).expect("create older pin");
        let newer = create(&connection, "Newer", 2000).expect("create newer pin");

        archive(&connection, older.id, 3000).expect("archive older pin");

        let pins = list_active(&connection).expect("list pins");

        assert_eq!(pins.len(), 1);
        assert_eq!(pins[0].id, newer.id);
    }

    #[test]
    fn archives_pin() {
        let connection = migrated_connection();
        let pin = create(&connection, "Archive me", 1000).expect("create pin");

        let archived = archive(&connection, pin.id, 2000).expect("archive pin");

        assert_eq!(archived.archived_at_ms, Some(2000));
        assert_eq!(archived.updated_at_ms, 2000);
    }

    #[test]
    fn updates_pin_body() {
        let connection = migrated_connection();
        let pin = create(&connection, "Before", 1000).expect("create pin");

        let updated = update_body(&connection, pin.id, "After", 2000).expect("update pin");

        assert_eq!(updated.body, "After");
        assert_eq!(updated.updated_at_ms, 2000);
        assert_eq!(updated.archived_at_ms, None);
    }
}
