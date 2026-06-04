use crate::db::{self, Profile};

#[tauri::command]
pub fn get_profiles() -> Result<Vec<Profile>, String> {
    db::get_profiles()
}

#[tauri::command]
pub fn save_profile(profile: Profile) -> Result<(), String> {
    db::save_profile(&profile)
}

#[tauri::command]
pub fn create_profile(name: String) -> Result<Profile, String> {
    db::create_profile(&name)
}

#[tauri::command]
pub fn rename_profile(old_name: String, new_name: String) -> Result<Profile, String> {
    let renamed = db::rename_profile(&old_name, &new_name)?;
    let _ = db::save_setting("activeProfile", &renamed.name);
    Ok(renamed)
}

#[tauri::command]
pub fn delete_profile(name: String) -> Result<(), String> {
    db::delete_profile(&name)
}

#[tauri::command]
pub fn duplicate_profile(name: String, new_name: String) -> Result<Profile, String> {
    db::duplicate_profile(&name, &new_name)
}

#[tauri::command]
pub fn set_active_profile(name: String) -> Result<(), String> {
    db::save_setting("activeProfile", &name)
}
