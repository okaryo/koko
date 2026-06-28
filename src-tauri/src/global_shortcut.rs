use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const DEFAULT_DAILY_NOTE_GLOBAL_SHORTCUT: &str = "CommandOrControl+Shift+L";
const DAILY_NOTE_FOCUS_EVENT: &str = "daily-note:focus";
const MAIN_WINDOW_LABEL: &str = "main";

pub fn setup_global_shortcuts(app: &AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(
            DEFAULT_DAILY_NOTE_GLOBAL_SHORTCUT,
            |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = focus_daily_note(app);
                }
            },
        )
        .map_err(|error| format!("Failed to register global shortcut: {error}"))
}

fn focus_daily_note(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "Main window was not found.".to_string())?;

    window.show().map_err(|error| error.to_string())?;
    window.unminimize().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    window
        .emit(DAILY_NOTE_FOCUS_EVENT, ())
        .map_err(|error| error.to_string())
}
