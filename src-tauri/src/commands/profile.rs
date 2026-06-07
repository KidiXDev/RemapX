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

use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn export_profile(app_handle: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    let profiles = db::get_profiles()?;
    let profile = profiles
        .iter()
        .find(|p| p.name == name)
        .ok_or_else(|| format!("Profile '{}' not found", name))?;

    let default_filename = format!("{}.rmp", name);
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("RemapX Profiles", &["rmp"])
        .set_file_name(default_filename)
        .blocking_save_file();

    if let Some(file_path) = file_path {
        let path = file_path.into_path().map_err(|e| e.to_string())?;
        // Minify the JSON output as requested by user
        let json = serde_json::to_string(&profile).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn import_profile(app_handle: tauri::AppHandle) -> Result<Option<Profile>, String> {
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("RemapX Profiles", &["rmp"])
        .blocking_pick_file();

    if let Some(file_path) = file_path {
        let path = file_path.into_path().map_err(|e| e.to_string())?;
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let profile: Profile = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse profile JSON: {}", e))?;
        Ok(Some(profile))
    } else {
        Ok(None)
    }
}

