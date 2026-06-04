use crate::db;
use crate::models::EngineLog;
use tauri::{AppHandle, Emitter};

pub fn is_setting_enabled(key: &str, default: bool) -> bool {
    db::get_settings()
        .ok()
        .and_then(|s| s.values.get(key).cloned())
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(default)
}

pub fn is_developer_mode_enabled() -> bool {
    is_setting_enabled("developerMode", false)
}

pub fn should_minimize_to_tray() -> bool {
    is_setting_enabled("minimizeToTray", true)
}

pub fn should_start_hidden_on_launch() -> bool {
    should_minimize_to_tray() && is_setting_enabled("startMinimized", false)
}

pub fn is_portable_build() -> bool {
    matches!(option_env!("REMAPX_BUILD_FLAVOR"), Some("portable"))
}

pub fn emit_engine_log(app: &AppHandle, message: impl Into<String>, verbose: bool) {
    if verbose && !is_developer_mode_enabled() {
        return;
    }

    let _ = app.emit(
        "engine-log",
        EngineLog {
            message: message.into(),
        },
    );
}

#[cfg(target_os = "windows")]
pub fn is_own_window_focused() -> bool {
    use windows_sys::Win32::System::Threading::GetCurrentProcessId;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return false;
        }

        let mut pid = 0_u32;
        GetWindowThreadProcessId(hwnd, &mut pid);
        pid != 0 && pid == GetCurrentProcessId()
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_own_window_focused() -> bool {
    false
}
