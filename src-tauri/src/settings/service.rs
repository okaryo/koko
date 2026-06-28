use super::model::AppSettings;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const SETTINGS_FILE_NAME: &str = "settings.json";

pub fn load(app: &AppHandle) -> Result<AppSettings, String> {
    load_from_path(&settings_path(app)?)
}

pub fn save(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    save_to_path(&settings_path(app)?, settings)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))?;

    Ok(config_dir.join(SETTINGS_FILE_NAME))
}

fn load_from_path(path: &Path) -> Result<AppSettings, String> {
    match fs::read_to_string(path) {
        Ok(json) => Ok(serde_json::from_str(&json).unwrap_or_default()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(AppSettings::default()),
        Err(error) => Err(format!("Failed to read settings: {error}")),
    }
}

fn save_to_path(path: &Path, settings: &AppSettings) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Settings path has no parent directory.".to_string())?;
    let temporary_path = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {error}"))?;

    fs::create_dir_all(parent)
        .map_err(|error| format!("Failed to create settings directory: {error}"))?;
    fs::write(&temporary_path, json)
        .map_err(|error| format!("Failed to write temporary settings: {error}"))?;
    fs::rename(&temporary_path, path)
        .map_err(|error| format!("Failed to replace settings file: {error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loads_defaults_when_settings_file_is_missing() {
        let path = temporary_settings_path("missing");

        let settings = load_from_path(&path).expect("load missing settings");

        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn fills_missing_fields_from_defaults() {
        let settings: AppSettings = serde_json::from_str("{}").expect("deserialize empty settings");

        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn falls_back_to_defaults_for_invalid_json() {
        let path = temporary_settings_path("invalid");

        fs::write(&path, "{invalid json").expect("write invalid settings");
        let settings = load_from_path(&path).expect("load invalid settings");
        let _ = fs::remove_file(&path);

        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn saves_and_loads_settings() {
        let path = temporary_settings_path("save");
        let settings = AppSettings {
            global_shortcut: super::super::model::GlobalShortcutSettings {
                daily_note_focus: "CommandOrControl+Shift+J".to_string(),
            },
            pomodoro: super::super::model::PomodoroSettings {
                focus_duration_minutes: 45,
                focus_volume: 12,
                completion_volume: 34,
            },
        };

        save_to_path(&path, &settings).expect("save settings");
        let loaded_settings = load_from_path(&path).expect("load settings");
        let _ = fs::remove_file(&path);

        assert_eq!(loaded_settings, settings);
    }

    fn temporary_settings_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("koko-{name}-settings-{}.json", std::process::id()))
    }
}
