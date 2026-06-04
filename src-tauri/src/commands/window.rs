use crate::models::AppRuntimeState;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager};

pub fn reveal_main_window(app: &AppHandle, respect_initial_show_flag: bool) -> Result<(), String> {
    if respect_initial_show_flag {
        if let Some(state) = app.try_state::<AppRuntimeState>() {
            if state.skip_initial_show.swap(false, Ordering::SeqCst) {
                return Ok(());
            }
        }
    }

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    let _ = window.unminimize();
    window.show().map_err(|e| e.to_string())?;
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    reveal_main_window(&app, true)
}

#[tauri::command]
pub fn open_main_devtools(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    #[cfg(debug_assertions)]
    {
        window.open_devtools();
        Ok(())
    }

    #[cfg(not(debug_assertions))]
    {
        let _ = window;
        Err("Devtools are only available in debug builds".to_string())
    }
}
