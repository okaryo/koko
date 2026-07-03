use serde::{Deserialize, Serialize};

pub const DEFAULT_DAILY_NOTE_GLOBAL_SHORTCUT: &str = "CommandOrControl+Shift+L";
pub const DEFAULT_POMODORO_FOCUS_VOLUME: u8 = 100;
pub const DEFAULT_POMODORO_COMPLETION_VOLUME: u8 = 100;
pub const DEFAULT_POMODORO_FOCUS_DURATION_MINUTES: u8 = 25;
pub const MIN_POMODORO_FOCUS_DURATION_MINUTES: u8 = 1;
pub const MAX_POMODORO_FOCUS_DURATION_MINUTES: u8 = 60;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub daily_note: DailyNoteSettings,
    #[serde(default)]
    pub global_shortcut: GlobalShortcutSettings,
    #[serde(default)]
    pub pomodoro: PomodoroSettings,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyNoteSettings {
    #[serde(default)]
    pub template_markdown: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalShortcutSettings {
    #[serde(default = "default_daily_note_global_shortcut")]
    pub daily_note_focus: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSettings {
    #[serde(default = "default_pomodoro_focus_duration_minutes")]
    pub focus_duration_minutes: u8,
    #[serde(default = "default_pomodoro_focus_volume")]
    pub focus_volume: u8,
    #[serde(default = "default_pomodoro_completion_volume")]
    pub completion_volume: u8,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            daily_note: DailyNoteSettings::default(),
            global_shortcut: GlobalShortcutSettings::default(),
            pomodoro: PomodoroSettings {
                focus_duration_minutes: DEFAULT_POMODORO_FOCUS_DURATION_MINUTES,
                focus_volume: DEFAULT_POMODORO_FOCUS_VOLUME,
                completion_volume: DEFAULT_POMODORO_COMPLETION_VOLUME,
            },
        }
    }
}

impl Default for GlobalShortcutSettings {
    fn default() -> Self {
        Self {
            daily_note_focus: default_daily_note_global_shortcut(),
        }
    }
}

impl Default for PomodoroSettings {
    fn default() -> Self {
        Self {
            focus_duration_minutes: DEFAULT_POMODORO_FOCUS_DURATION_MINUTES,
            focus_volume: DEFAULT_POMODORO_FOCUS_VOLUME,
            completion_volume: DEFAULT_POMODORO_COMPLETION_VOLUME,
        }
    }
}

fn default_daily_note_global_shortcut() -> String {
    DEFAULT_DAILY_NOTE_GLOBAL_SHORTCUT.to_string()
}

fn default_pomodoro_focus_duration_minutes() -> u8 {
    DEFAULT_POMODORO_FOCUS_DURATION_MINUTES
}

fn default_pomodoro_focus_volume() -> u8 {
    DEFAULT_POMODORO_FOCUS_VOLUME
}

fn default_pomodoro_completion_volume() -> u8 {
    DEFAULT_POMODORO_COMPLETION_VOLUME
}
