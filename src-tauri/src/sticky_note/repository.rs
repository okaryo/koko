use super::model::StickyNote;
use rusqlite::{params, Connection, Transaction};

pub fn list_active(connection: &Connection) -> Result<Vec<StickyNote>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                body,
                created_at_ms,
                updated_at_ms,
                pinned_at_ms,
                position,
                archived_at_ms
            FROM sticky_notes
            WHERE archived_at_ms IS NULL
            ORDER BY
                pinned_at_ms IS NULL ASC,
                position ASC,
                id ASC
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

pub fn create(
    connection: &mut Connection,
    body: &str,
    now_ms: i64,
) -> Result<Vec<StickyNote>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start StickyNote create transaction: {error}"))?;

    transaction
        .execute(
            "
            UPDATE sticky_notes
            SET position = position + 1
            WHERE archived_at_ms IS NULL
              AND pinned_at_ms IS NULL
            ",
            [],
        )
        .map_err(|error| format!("Failed to make room for created StickyNote: {error}"))?;

    transaction
        .execute(
            "
            INSERT INTO sticky_notes
                (
                    body,
                    created_at_ms,
                    updated_at_ms,
                    pinned_at_ms,
                    position,
                    archived_at_ms
                )
            VALUES (?1, ?2, ?2, NULL, 0, NULL)
            ",
            params![body, now_ms],
        )
        .map_err(|error| format!("Failed to create StickyNote: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit StickyNote create: {error}"))?;

    list_active(connection)
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

pub fn archive(
    connection: &mut Connection,
    id: u32,
    now_ms: i64,
) -> Result<Vec<StickyNote>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start StickyNote archive transaction: {error}"))?;
    let sticky_note = find_active_by_id(&transaction, id)?;

    let Some(sticky_note) = sticky_note else {
        return Err(format!("Active StickyNote {id} was not found."));
    };

    transaction
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

    close_position_gap(&transaction, &sticky_note)?;

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit StickyNote archive: {error}"))?;

    list_active(connection)
}

pub fn pin(connection: &mut Connection, id: u32, now_ms: i64) -> Result<Vec<StickyNote>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start StickyNote pin transaction: {error}"))?;
    let sticky_note = find_active_by_id(&transaction, id)?;

    let Some(sticky_note) = sticky_note else {
        return Err(format!("Active StickyNote {id} was not found."));
    };

    if sticky_note.pinned_at_ms.is_some() {
        transaction
            .commit()
            .map_err(|error| format!("Failed to commit StickyNote pin: {error}"))?;
        return list_active(connection);
    }

    close_position_gap(&transaction, &sticky_note)?;

    transaction
        .execute(
            "
            UPDATE sticky_notes
            SET position = position + 1
            WHERE archived_at_ms IS NULL
              AND pinned_at_ms IS NOT NULL
            ",
            [],
        )
        .map_err(|error| format!("Failed to make room for pinned StickyNote: {error}"))?;

    transaction
        .execute(
            "
            UPDATE sticky_notes
            SET pinned_at_ms = ?1,
                updated_at_ms = ?1,
                position = 0
            WHERE id = ?2
              AND archived_at_ms IS NULL
            ",
            params![now_ms, id],
        )
        .map_err(|error| format!("Failed to pin StickyNote: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit StickyNote pin: {error}"))?;

    list_active(connection)
}

pub fn unpin(connection: &mut Connection, id: u32, now_ms: i64) -> Result<Vec<StickyNote>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start StickyNote unpin transaction: {error}"))?;
    let sticky_note = find_active_by_id(&transaction, id)?;

    let Some(sticky_note) = sticky_note else {
        return Err(format!("Active StickyNote {id} was not found."));
    };

    if sticky_note.pinned_at_ms.is_none() {
        transaction
            .commit()
            .map_err(|error| format!("Failed to commit StickyNote unpin: {error}"))?;
        return list_active(connection);
    }

    close_position_gap(&transaction, &sticky_note)?;

    transaction
        .execute(
            "
            UPDATE sticky_notes
            SET position = position + 1
            WHERE archived_at_ms IS NULL
              AND pinned_at_ms IS NULL
            ",
            [],
        )
        .map_err(|error| format!("Failed to make room for unpinned StickyNote: {error}"))?;

    transaction
        .execute(
            "
            UPDATE sticky_notes
            SET pinned_at_ms = NULL,
                updated_at_ms = ?1,
                position = 0
            WHERE id = ?2
              AND archived_at_ms IS NULL
            ",
            params![now_ms, id],
        )
        .map_err(|error| format!("Failed to unpin StickyNote: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit StickyNote unpin: {error}"))?;

    list_active(connection)
}

pub fn reorder(
    connection: &mut Connection,
    id: u32,
    target_position: i64,
) -> Result<Vec<StickyNote>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Failed to start StickyNote reorder transaction: {error}"))?;
    let sticky_note = find_active_by_id(&transaction, id)?;

    let Some(sticky_note) = sticky_note else {
        return Err(format!("Active StickyNote {id} was not found."));
    };

    let group_size = active_group_size(&transaction, sticky_note.pinned_at_ms.is_some())?;

    if target_position < 0 || target_position >= group_size {
        return Err(format!(
            "StickyNote target position {target_position} is outside its group."
        ));
    }

    if target_position < sticky_note.position {
        shift_positions_down(
            &transaction,
            sticky_note.pinned_at_ms.is_some(),
            target_position,
            sticky_note.position,
        )?;
    } else if target_position > sticky_note.position {
        shift_positions_up(
            &transaction,
            sticky_note.pinned_at_ms.is_some(),
            sticky_note.position,
            target_position,
        )?;
    }

    if target_position != sticky_note.position {
        transaction
            .execute(
                "
                UPDATE sticky_notes
                SET position = ?1
                WHERE id = ?2
                  AND archived_at_ms IS NULL
                ",
                params![target_position, id],
            )
            .map_err(|error| format!("Failed to reorder StickyNote: {error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Failed to commit StickyNote reorder: {error}"))?;

    list_active(connection)
}

fn find_by_id(connection: &Connection, id: u32) -> Result<Option<StickyNote>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                body,
                created_at_ms,
                updated_at_ms,
                pinned_at_ms,
                position,
                archived_at_ms
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

fn find_active_by_id(connection: &Connection, id: u32) -> Result<Option<StickyNote>, String> {
    Ok(find_by_id(connection, id)?.filter(|sticky_note| sticky_note.archived_at_ms.is_none()))
}

fn row_to_sticky_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<StickyNote> {
    Ok(StickyNote {
        id: row.get(0)?,
        body: row.get(1)?,
        created_at_ms: row.get(2)?,
        updated_at_ms: row.get(3)?,
        pinned_at_ms: row.get(4)?,
        position: row.get(5)?,
        archived_at_ms: row.get(6)?,
    })
}

fn close_position_gap(
    transaction: &Transaction<'_>,
    sticky_note: &StickyNote,
) -> Result<(), String> {
    let (group_condition, group_name) = if sticky_note.pinned_at_ms.is_some() {
        ("pinned_at_ms IS NOT NULL", "pinned")
    } else {
        ("pinned_at_ms IS NULL", "unpinned")
    };
    let sql = format!(
        "
        UPDATE sticky_notes
        SET position = position - 1
        WHERE archived_at_ms IS NULL
          AND {group_condition}
          AND position > ?1
        "
    );

    transaction
        .execute(&sql, params![sticky_note.position])
        .map_err(|error| {
            format!("Failed to close {group_name} StickyNote position gap: {error}")
        })?;

    Ok(())
}

fn active_group_size(transaction: &Transaction<'_>, pinned: bool) -> Result<i64, String> {
    let group_condition = if pinned {
        "pinned_at_ms IS NOT NULL"
    } else {
        "pinned_at_ms IS NULL"
    };
    let sql = format!(
        "
        SELECT COUNT(*)
        FROM sticky_notes
        WHERE archived_at_ms IS NULL
          AND {group_condition}
        "
    );

    transaction
        .query_row(&sql, [], |row| row.get(0))
        .map_err(|error| format!("Failed to count StickyNotes in reorder group: {error}"))
}

fn shift_positions_down(
    transaction: &Transaction<'_>,
    pinned: bool,
    target_position: i64,
    current_position: i64,
) -> Result<(), String> {
    let group_condition = if pinned {
        "pinned_at_ms IS NOT NULL"
    } else {
        "pinned_at_ms IS NULL"
    };
    let sql = format!(
        "
        UPDATE sticky_notes
        SET position = position + 1
        WHERE archived_at_ms IS NULL
          AND {group_condition}
          AND position >= ?1
          AND position < ?2
        "
    );

    transaction
        .execute(&sql, params![target_position, current_position])
        .map_err(|error| format!("Failed to shift StickyNotes down: {error}"))?;

    Ok(())
}

fn shift_positions_up(
    transaction: &Transaction<'_>,
    pinned: bool,
    current_position: i64,
    target_position: i64,
) -> Result<(), String> {
    let group_condition = if pinned {
        "pinned_at_ms IS NOT NULL"
    } else {
        "pinned_at_ms IS NULL"
    };
    let sql = format!(
        "
        UPDATE sticky_notes
        SET position = position - 1
        WHERE archived_at_ms IS NULL
          AND {group_condition}
          AND position > ?1
          AND position <= ?2
        "
    );

    transaction
        .execute(&sql, params![current_position, target_position])
        .map_err(|error| format!("Failed to shift StickyNotes up: {error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_support::migrated_connection;

    fn create_one(connection: &mut Connection, body: &str, now_ms: i64) -> StickyNote {
        create(connection, body, now_ms)
            .expect("create StickyNote")
            .into_iter()
            .find(|sticky_note| sticky_note.body == body)
            .expect("find created StickyNote")
    }

    fn note_bodies(sticky_notes: &[StickyNote]) -> Vec<&str> {
        sticky_notes
            .iter()
            .map(|sticky_note| sticky_note.body.as_str())
            .collect()
    }

    fn group_positions(sticky_notes: &[StickyNote], pinned: bool) -> Vec<i64> {
        sticky_notes
            .iter()
            .filter(|sticky_note| sticky_note.pinned_at_ms.is_some() == pinned)
            .map(|sticky_note| sticky_note.position)
            .collect()
    }

    #[test]
    fn creates_unpinned_sticky_notes_at_the_top() {
        let mut connection = migrated_connection();

        create_one(&mut connection, "Older", 1000);
        let sticky_notes = create(&mut connection, "Newer", 2000).expect("create newer StickyNote");
        let newer = &sticky_notes[0];

        assert_eq!(note_bodies(&sticky_notes), vec!["Newer", "Older"]);
        assert_eq!(group_positions(&sticky_notes, false), vec![0, 1]);
        assert_eq!(newer.created_at_ms, 2000);
        assert_eq!(newer.updated_at_ms, 2000);
        assert_eq!(newer.pinned_at_ms, None);
        assert_eq!(newer.archived_at_ms, None);
    }

    #[test]
    fn archives_sticky_note_and_closes_its_group_position_gap() {
        let mut connection = migrated_connection();
        let first = create_one(&mut connection, "First", 1000);
        create_one(&mut connection, "Second", 2000);
        create_one(&mut connection, "Third", 3000);

        let sticky_notes = archive(&mut connection, first.id, 4000).expect("archive StickyNote");
        let archived = find_by_id(&connection, first.id)
            .expect("read archived StickyNote")
            .expect("find archived StickyNote");

        assert_eq!(note_bodies(&sticky_notes), vec!["Third", "Second"]);
        assert_eq!(group_positions(&sticky_notes, false), vec![0, 1]);
        assert_eq!(archived.archived_at_ms, Some(4000));
        assert_eq!(archived.updated_at_ms, 4000);
    }

    #[test]
    fn updates_sticky_note_body() {
        let mut connection = migrated_connection();
        let sticky_note = create_one(&mut connection, "Before", 1000);

        let updated =
            update_body(&connection, sticky_note.id, "After", 2000).expect("update sticky note");

        assert_eq!(updated.body, "After");
        assert_eq!(updated.updated_at_ms, 2000);
        assert_eq!(updated.pinned_at_ms, None);
        assert_eq!(updated.position, 0);
        assert_eq!(updated.archived_at_ms, None);
    }

    #[test]
    fn pins_to_the_top_and_closes_the_unpinned_gap() {
        let mut connection = migrated_connection();
        let oldest = create_one(&mut connection, "Oldest", 1000);
        create_one(&mut connection, "Newest", 2000);

        let sticky_notes = pin(&mut connection, oldest.id, 3000).expect("pin StickyNote");

        assert_eq!(note_bodies(&sticky_notes), vec!["Oldest", "Newest"]);
        assert_eq!(group_positions(&sticky_notes, true), vec![0]);
        assert_eq!(group_positions(&sticky_notes, false), vec![0]);
        assert_eq!(sticky_notes[0].pinned_at_ms, Some(3000));
        assert_eq!(sticky_notes[0].updated_at_ms, 3000);
    }

    #[test]
    fn unpins_to_the_top_and_closes_the_pinned_gap() {
        let mut connection = migrated_connection();
        let first = create_one(&mut connection, "First", 1000);
        let second = create_one(&mut connection, "Second", 2000);
        create_one(&mut connection, "Third", 3000);
        pin(&mut connection, first.id, 4000).expect("pin first StickyNote");
        pin(&mut connection, second.id, 5000).expect("pin second StickyNote");

        let sticky_notes = unpin(&mut connection, second.id, 6000).expect("unpin StickyNote");

        assert_eq!(note_bodies(&sticky_notes), vec!["First", "Second", "Third"]);
        assert_eq!(group_positions(&sticky_notes, true), vec![0]);
        assert_eq!(group_positions(&sticky_notes, false), vec![0, 1]);
        assert_eq!(sticky_notes[1].pinned_at_ms, None);
        assert_eq!(sticky_notes[1].updated_at_ms, 6000);
    }

    #[test]
    fn reorders_within_unpinned_group_in_both_directions() {
        let mut connection = migrated_connection();
        let first = create_one(&mut connection, "First", 1000);
        create_one(&mut connection, "Second", 2000);
        let third = create_one(&mut connection, "Third", 3000);

        let moved_up = reorder(&mut connection, first.id, 0).expect("move StickyNote to group top");
        assert_eq!(note_bodies(&moved_up), vec!["First", "Third", "Second"]);
        assert_eq!(group_positions(&moved_up, false), vec![0, 1, 2]);

        let moved_down =
            reorder(&mut connection, first.id, 2).expect("move StickyNote to group bottom");
        assert_eq!(note_bodies(&moved_down), vec!["Third", "Second", "First"]);
        assert_eq!(group_positions(&moved_down, false), vec![0, 1, 2]);
        assert_eq!(third.pinned_at_ms, None);
    }

    #[test]
    fn reorders_only_inside_the_existing_pin_group_without_touching_timestamps() {
        let mut connection = migrated_connection();
        let first = create_one(&mut connection, "First", 1000);
        let second = create_one(&mut connection, "Second", 2000);
        let unpinned = create_one(&mut connection, "Unpinned", 3000);
        pin(&mut connection, first.id, 4000).expect("pin first StickyNote");
        let before_reorder = pin(&mut connection, second.id, 5000).expect("pin second StickyNote");
        let moved_before = before_reorder
            .iter()
            .find(|sticky_note| sticky_note.id == first.id)
            .expect("find moved StickyNote before reorder")
            .clone();

        let sticky_notes =
            reorder(&mut connection, first.id, 0).expect("reorder pinned StickyNote");
        let moved_after = sticky_notes
            .iter()
            .find(|sticky_note| sticky_note.id == first.id)
            .expect("find moved StickyNote after reorder");

        assert_eq!(
            note_bodies(&sticky_notes),
            vec!["First", "Second", "Unpinned"]
        );
        assert_eq!(group_positions(&sticky_notes, true), vec![0, 1]);
        assert_eq!(group_positions(&sticky_notes, false), vec![0]);
        assert_eq!(moved_after.pinned_at_ms, moved_before.pinned_at_ms);
        assert_eq!(moved_after.updated_at_ms, moved_before.updated_at_ms);
        assert_eq!(unpinned.position, 0);
    }

    #[test]
    fn same_position_reorder_is_a_noop() {
        let mut connection = migrated_connection();
        let sticky_note = create_one(&mut connection, "Only", 1000);

        let sticky_notes =
            reorder(&mut connection, sticky_note.id, 0).expect("reorder to same position");

        assert_eq!(note_bodies(&sticky_notes), vec!["Only"]);
        assert_eq!(sticky_notes[0].position, 0);
        assert_eq!(sticky_notes[0].updated_at_ms, 1000);
    }

    #[test]
    fn rejects_positions_outside_the_existing_group() {
        let mut connection = migrated_connection();
        let sticky_note = create_one(&mut connection, "Only", 1000);

        let negative_error =
            reorder(&mut connection, sticky_note.id, -1).expect_err("reject negative position");
        let end_error =
            reorder(&mut connection, sticky_note.id, 1).expect_err("reject position after group");
        let sticky_notes = list_active(&connection).expect("list unchanged StickyNotes");

        assert!(negative_error.contains("outside its group"));
        assert!(end_error.contains("outside its group"));
        assert_eq!(note_bodies(&sticky_notes), vec!["Only"]);
        assert_eq!(sticky_notes[0].position, 0);
    }

    #[test]
    fn rejects_reordering_an_archived_sticky_note() {
        let mut connection = migrated_connection();
        let sticky_note = create_one(&mut connection, "Archived", 1000);
        archive(&mut connection, sticky_note.id, 2000).expect("archive StickyNote");

        let error =
            reorder(&mut connection, sticky_note.id, 0).expect_err("reject archived StickyNote");

        assert!(error.contains("was not found"));
    }
}
