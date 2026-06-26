use serde::{Deserialize, Serialize};

pub const DEFAULT_POMODORO_FOCUS_VOLUME: u8 = 100;
pub const DEFAULT_POMODORO_COMPLETION_VOLUME: u8 = 100;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub pomodoro: PomodoroSettings,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSettings {
    #[serde(default = "default_pomodoro_focus_volume")]
    pub focus_volume: u8,
    #[serde(default = "default_pomodoro_completion_volume")]
    pub completion_volume: u8,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            pomodoro: PomodoroSettings {
                focus_volume: DEFAULT_POMODORO_FOCUS_VOLUME,
                completion_volume: DEFAULT_POMODORO_COMPLETION_VOLUME,
            },
        }
    }
}

impl Default for PomodoroSettings {
    fn default() -> Self {
        Self {
            focus_volume: DEFAULT_POMODORO_FOCUS_VOLUME,
            completion_volume: DEFAULT_POMODORO_COMPLETION_VOLUME,
        }
    }
}

fn default_pomodoro_focus_volume() -> u8 {
    DEFAULT_POMODORO_FOCUS_VOLUME
}

fn default_pomodoro_completion_volume() -> u8 {
    DEFAULT_POMODORO_COMPLETION_VOLUME
}
