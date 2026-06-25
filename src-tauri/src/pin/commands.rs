use super::model::Pin;
use super::repository;
use crate::db;
use tauri::AppHandle;

#[tauri::command]
pub fn list_pins(app: AppHandle) -> Result<Vec<Pin>, String> {
    let connection = db::open(&app)?;

    repository::list_active(&connection)
}

#[tauri::command]
pub fn create_pin(app: AppHandle, body: String, now_ms: i64) -> Result<Pin, String> {
    let connection = db::open(&app)?;

    repository::create(&connection, body.trim(), now_ms)
}

#[tauri::command]
pub fn archive_pin(app: AppHandle, id: u32, now_ms: i64) -> Result<Pin, String> {
    let connection = db::open(&app)?;

    repository::archive(&connection, id, now_ms)
}
