mod daily_note;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            db::init(app.handle()).map_err(std::io::Error::other)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            daily_note::commands::get_or_create_daily_note,
            daily_note::commands::update_daily_note_body,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
