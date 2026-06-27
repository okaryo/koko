use super::model::StickyNote;
use super::repository;
use crate::db;
use tauri::AppHandle;

#[tauri::command]
pub fn list_sticky_notes(app: AppHandle) -> Result<Vec<StickyNote>, String> {
    let connection = db::open(&app)?;

    repository::list_active(&connection)
}

#[tauri::command]
pub fn create_sticky_note(app: AppHandle, body: String, now_ms: i64) -> Result<StickyNote, String> {
    let connection = db::open(&app)?;

    repository::create(&connection, body.trim(), now_ms)
}

#[tauri::command]
pub fn update_sticky_note_body(
    app: AppHandle,
    id: u32,
    body: String,
    now_ms: i64,
) -> Result<StickyNote, String> {
    let connection = db::open(&app)?;

    repository::update_body(&connection, id, body.trim(), now_ms)
}

#[tauri::command]
pub fn archive_sticky_note(app: AppHandle, id: u32, now_ms: i64) -> Result<StickyNote, String> {
    let connection = db::open(&app)?;

    repository::archive(&connection, id, now_ms)
}

#[tauri::command]
pub fn pin_sticky_note(app: AppHandle, id: u32, now_ms: i64) -> Result<StickyNote, String> {
    let connection = db::open(&app)?;

    repository::pin(&connection, id, now_ms)
}

#[tauri::command]
pub fn unpin_sticky_note(app: AppHandle, id: u32, now_ms: i64) -> Result<StickyNote, String> {
    let connection = db::open(&app)?;

    repository::unpin(&connection, id, now_ms)
}
