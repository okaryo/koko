import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  pomodoro: PomodoroSettings;
};

export type PomodoroSettings = {
  focusDurationMinutes: number;
  focusVolume: number;
  completionVolume: number;
};

export function getSettings() {
  return invoke<AppSettings>("get_settings");
}

export function updatePomodoroVolumeSettings(
  focusVolume: number,
  completionVolume: number,
) {
  return invoke<AppSettings>("update_pomodoro_volume_settings", {
    focusVolume,
    completionVolume,
  });
}

export function updatePomodoroTimerSettings(focusDurationMinutes: number) {
  return invoke<AppSettings>("update_pomodoro_timer_settings", {
    focusDurationMinutes,
  });
}
