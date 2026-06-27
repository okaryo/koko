use super::model::{DailyNote, DailyNoteNavigation};
use super::repository;
use crate::db;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn get_or_create_daily_note(
    app: AppHandle,
    note_date: String,
    now_ms: i64,
) -> Result<DailyNote, String> {
    let connection = db::open(&app)?;

    repository::get_or_create(&connection, &note_date, now_ms)
}

#[tauri::command]
pub fn get_daily_note(app: AppHandle, note_date: String) -> Result<Option<DailyNote>, String> {
    let connection = db::open(&app)?;

    repository::get(&connection, &note_date)
}

#[tauri::command]
pub fn get_daily_note_navigation(
    app: AppHandle,
    note_date: String,
) -> Result<DailyNoteNavigation, String> {
    let connection = db::open(&app)?;

    repository::navigation(&connection, &note_date)
}

#[tauri::command]
pub fn update_daily_note_body(
    app: AppHandle,
    id: u32,
    body_html: String,
    updated_at_ms: i64,
) -> Result<DailyNote, String> {
    let connection = db::open(&app)?;
    let daily_note = repository::update_body(&connection, id, &body_html, updated_at_ms)?;

    app.emit("daily-note:updated", daily_note.clone())
        .map_err(|error| format!("Failed to emit DailyNote update event: {error}"))?;

    Ok(daily_note)
}
