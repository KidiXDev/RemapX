use crate::db::{self, SettingsPayload};
use crate::utils::{autostart, settings_helper};

#[tauri::command]
pub fn get_settings() -> Result<SettingsPayload, String> {
    db::get_settings()
}

#[tauri::command]
pub fn save_setting(key: String, value: String) -> Result<(), String> {
    db::save_setting(&key, &value)
}

#[tauri::command]
pub fn set_run_on_boot(enabled: bool) -> Result<(), String> {
    if settings_helper::is_portable_build() {
        db::save_setting("runOnBoot", "false")?;
        return Err("Start with Windows is unavailable in the portable build".to_string());
    }

    autostart::set_windows_run_on_boot(enabled)?;
    db::save_setting("runOnBoot", if enabled { "true" } else { "false" })
}
