mod daily_note;
mod db;
mod settings;
mod sticky_note;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            db::init(app.handle()).map_err(std::io::Error::other)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            daily_note::commands::get_or_create_daily_note,
            daily_note::commands::update_daily_note_body,
            sticky_note::commands::list_sticky_notes,
            sticky_note::commands::create_sticky_note,
            sticky_note::commands::update_sticky_note_body,
            sticky_note::commands::archive_sticky_note,
            settings::commands::get_settings,
            settings::commands::update_pomodoro_timer_settings,
            settings::commands::update_pomodoro_volume_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
