import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  dailyNote: DailyNoteSettings;
  globalShortcut: GlobalShortcutSettings;
  pomodoro: PomodoroSettings;
};

export type DailyNoteSettings = {
  templateMarkdown: string;
};

export type GlobalShortcutSettings = {
  dailyNoteFocus: string;
};

export type PomodoroSettings = {
  focusDurationMinutes: number;
  focusVolume: number;
  completionVolume: number;
};

export function getSettings() {
  return invoke<AppSettings>("get_settings");
}

export function updateDailyNoteGlobalShortcut(shortcut: string) {
  return invoke<AppSettings>("update_daily_note_global_shortcut", {
    shortcut,
  });
}

export function updateDailyNoteTemplateSettings(templateMarkdown: string) {
  return invoke<AppSettings>("update_daily_note_template_settings", {
    templateMarkdown,
  });
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
