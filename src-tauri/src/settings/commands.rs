use super::model::{
    AppSettings, MAX_POMODORO_FOCUS_DURATION_MINUTES, MIN_POMODORO_FOCUS_DURATION_MINUTES,
};
use super::service;
use tauri::AppHandle;

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    service::load(&app)
}

#[tauri::command]
pub fn update_pomodoro_volume_settings(
    app: AppHandle,
    focus_volume: u8,
    completion_volume: u8,
) -> Result<AppSettings, String> {
    let mut settings = service::load(&app)?;

    settings.pomodoro.focus_volume = focus_volume.min(100);
    settings.pomodoro.completion_volume = completion_volume.min(100);
    service::save(&app, &settings)?;

    Ok(settings)
}

#[tauri::command]
pub fn update_pomodoro_timer_settings(
    app: AppHandle,
    focus_duration_minutes: u8,
) -> Result<AppSettings, String> {
    let mut settings = service::load(&app)?;

    settings.pomodoro.focus_duration_minutes = focus_duration_minutes.clamp(
        MIN_POMODORO_FOCUS_DURATION_MINUTES,
        MAX_POMODORO_FOCUS_DURATION_MINUTES,
    );
    service::save(&app, &settings)?;

    Ok(settings)
}
