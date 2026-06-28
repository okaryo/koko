use crate::settings::{model::AppSettings, service};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const DAILY_NOTE_FOCUS_EVENT: &str = "daily-note:focus";
const MAIN_WINDOW_LABEL: &str = "main";

pub struct GlobalShortcutState {
    daily_note_focus: Mutex<String>,
}

impl GlobalShortcutState {
    fn new(daily_note_focus: String) -> Self {
        Self {
            daily_note_focus: Mutex::new(daily_note_focus),
        }
    }

    fn daily_note_focus(&self) -> Result<String, String> {
        self.daily_note_focus
            .lock()
            .map(|shortcut| shortcut.clone())
            .map_err(|_| "Failed to lock global shortcut state.".to_string())
    }

    fn set_daily_note_focus(&self, shortcut: String) -> Result<(), String> {
        self.daily_note_focus
            .lock()
            .map(|mut current| {
                *current = shortcut;
            })
            .map_err(|_| "Failed to lock global shortcut state.".to_string())
    }
}

pub fn setup_global_shortcuts(app: &AppHandle) -> Result<(), String> {
    let settings = service::load(app)?;
    let shortcut = settings.global_shortcut.daily_note_focus.clone();

    register_daily_note_focus_shortcut(app, &shortcut)?;
    app.manage(GlobalShortcutState::new(shortcut));

    Ok(())
}

#[tauri::command]
pub fn update_daily_note_global_shortcut(
    app: AppHandle,
    state: State<GlobalShortcutState>,
    shortcut: String,
) -> Result<AppSettings, String> {
    let shortcut = normalized_shortcut(shortcut)?;
    let current_shortcut = state.daily_note_focus()?;
    let mut settings = service::load(&app)?;

    if shortcut == current_shortcut {
        ensure_daily_note_focus_shortcut_registered(&app, &shortcut)?;
        settings.global_shortcut.daily_note_focus = shortcut;
        service::save(&app, &settings)?;
        return Ok(settings);
    }

    register_daily_note_focus_shortcut(&app, &shortcut)?;

    if app
        .global_shortcut()
        .is_registered(current_shortcut.as_str())
    {
        if let Err(error) = app.global_shortcut().unregister(current_shortcut.as_str()) {
            let _ = app.global_shortcut().unregister(shortcut.as_str());
            return Err(format!(
                "Failed to unregister previous global shortcut: {error}"
            ));
        }
    }

    settings.global_shortcut.daily_note_focus = shortcut.clone();

    if let Err(error) = service::save(&app, &settings) {
        let _ = app.global_shortcut().unregister(shortcut.as_str());
        let _ = ensure_daily_note_focus_shortcut_registered(&app, &current_shortcut);

        return Err(error);
    }

    state.set_daily_note_focus(shortcut)?;

    Ok(settings)
}

fn ensure_daily_note_focus_shortcut_registered(
    app: &AppHandle,
    shortcut: &str,
) -> Result<(), String> {
    if app.global_shortcut().is_registered(shortcut) {
        return Ok(());
    }

    register_daily_note_focus_shortcut(app, shortcut)
}

fn register_daily_note_focus_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = focus_daily_note(app);
            }
        })
        .map_err(|error| format!("Failed to register global shortcut: {error}"))
}

fn normalized_shortcut(shortcut: String) -> Result<String, String> {
    let shortcut = shortcut.trim();

    if shortcut.is_empty() {
        return Err("Global shortcut cannot be empty.".to_string());
    }

    Ok(shortcut
        .strip_prefix("Command+")
        .map(|key| format!("CommandOrControl+{key}"))
        .unwrap_or_else(|| shortcut.to_string()))
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
