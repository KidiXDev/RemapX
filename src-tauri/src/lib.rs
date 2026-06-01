mod db;
mod input_sim;
mod monitor;

use db::{Profile, SettingsPayload};
use gilrs::{Button, EventType, Gilrs};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{CloseHandle, HWND, INVALID_HANDLE_VALUE, LPARAM};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowTextLengthW, GetWindowThreadProcessId, IsWindowVisible,
};

struct EngineState {
    running: Arc<AtomicBool>,
}

#[derive(Clone, Serialize)]
struct GamepadButtonState {
    button_id: i64,
    pressed: bool,
}

#[derive(Clone, Serialize)]
struct EngineLog {
    message: String,
}

#[derive(Clone, Serialize)]
struct ConnectedGamepad {
    id: String,
    name: String,
}

#[derive(Clone, Serialize)]
struct ActiveProcess {
    pid: u32,
    exe_name: String,
}

#[tauri::command]
fn start_engine(app: AppHandle, engine: State<'_, EngineState>) -> Result<(), String> {
    if engine.running.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let running = Arc::clone(&engine.running);
    let app_handle = app.clone();

    thread::spawn(move || {
        let mut gilrs = match Gilrs::new() {
            Ok(g) => g,
            Err(err) => {
                let _ = app_handle.emit(
                    "engine-log",
                    EngineLog {
                        message: format!("Failed to initialize gilrs: {err}"),
                    },
                );
                return;
            }
        };

        let _ = app_handle.emit(
            "engine-log",
            EngineLog {
                message: "Input monitoring initialized at 1000Hz".to_string(),
            },
        );

        while running.load(Ordering::Relaxed) {
            while let Some(ev) = gilrs.next_event() {
                match ev.event {
                    EventType::ButtonPressed(btn, _) => {
                        let button_id = button_to_id(btn);
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id,
                                pressed: true,
                            },
                        );
                        trigger_mapping_action(button_id);
                    }
                    EventType::ButtonReleased(btn, _) => {
                        let button_id = button_to_id(btn);
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id,
                                pressed: false,
                            },
                        );
                    }
                    _ => {}
                }
            }

            thread::sleep(Duration::from_millis(1));
        }
    });

    monitor::spawn_monitor(app, Arc::clone(&engine.running));
    Ok(())
}

#[tauri::command]
fn stop_engine(engine: State<'_, EngineState>) -> Result<(), String> {
    engine.running.store(false, Ordering::SeqCst);
    Ok(())
}

fn button_to_id(button: Button) -> i64 {
    match button {
        Button::South => 0,
        Button::East => 1,
        Button::West => 2,
        Button::North => 3,
        Button::LeftTrigger => 4,
        Button::RightTrigger => 5,
        Button::LeftTrigger2 => 6,
        Button::RightTrigger2 => 7,
        Button::Select => 8,
        Button::Start => 9,
        Button::Mode => 10,
        Button::LeftThumb => 11,
        Button::RightThumb => 12,
        Button::DPadUp => 13,
        Button::DPadDown => 14,
        Button::DPadLeft => 15,
        Button::DPadRight => 16,
        _ => 99,
    }
}

fn trigger_mapping_action(button_id: i64) {
    let active_profile = db::get_settings()
        .ok()
        .and_then(|s| s.values.get("activeProfile").cloned())
        .unwrap_or_else(|| "Default".to_string());

    let profiles = match db::get_profiles() {
        Ok(p) => p,
        Err(_) => return,
    };

    let Some(profile) = profiles.into_iter().find(|p| p.name == active_profile) else {
        return;
    };

    let Some(mapping) = profile
        .mappings
        .into_iter()
        .find(|m| m.button_id == button_id)
    else {
        return;
    };

    if let Some(vk) = input_sim::key_to_vk(&mapping.key_str) {
        input_sim::tap_key(vk);
    }
}

#[tauri::command]
fn get_profiles() -> Result<Vec<Profile>, String> {
    db::get_profiles()
}

#[tauri::command]
fn save_profile(profile: Profile) -> Result<(), String> {
    db::save_profile(&profile)
}

#[tauri::command]
fn create_profile(name: String) -> Result<Profile, String> {
    db::create_profile(&name)
}

#[tauri::command]
fn rename_profile(old_name: String, new_name: String) -> Result<Profile, String> {
    let renamed = db::rename_profile(&old_name, &new_name)?;
    let _ = db::save_setting("activeProfile", &renamed.name);
    Ok(renamed)
}

#[tauri::command]
fn delete_profile(name: String) -> Result<(), String> {
    db::delete_profile(&name)
}

#[tauri::command]
fn duplicate_profile(name: String, new_name: String) -> Result<Profile, String> {
    db::duplicate_profile(&name, &new_name)
}

#[tauri::command]
fn set_active_profile(name: String) -> Result<(), String> {
    db::save_setting("activeProfile", &name)
}

#[tauri::command]
fn get_settings() -> Result<SettingsPayload, String> {
    db::get_settings()
}

#[tauri::command]
fn save_setting(key: String, value: String) -> Result<(), String> {
    db::save_setting(&key, &value)
}

#[tauri::command]
fn get_connected_gamepads() -> Result<Vec<ConnectedGamepad>, String> {
    let gilrs = Gilrs::new().map_err(|e| e.to_string())?;
    let mut pads = Vec::new();
    for (id, gamepad) in gilrs.gamepads() {
        if gamepad.is_connected() {
            pads.push(ConnectedGamepad {
                id: format!("{id:?}"),
                name: gamepad.name().to_string(),
            });
        }
    }
    Ok(pads)
}

#[cfg(target_os = "windows")]
fn collect_processes() -> Result<Vec<ActiveProcess>, String> {
    unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> i32 {
        if IsWindowVisible(hwnd) == 0 || GetWindowTextLengthW(hwnd) <= 0 {
            return 1;
        }

        let mut pid = 0_u32;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid != 0 {
            let pids = &mut *(lparam as *mut HashSet<u32>);
            pids.insert(pid);
        }
        1
    }

    let mut window_pids: HashSet<u32> = HashSet::new();
    unsafe {
        EnumWindows(Some(enum_windows_proc), &mut window_pids as *mut _ as LPARAM);
    }

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return Err("Failed to create process snapshot".to_string());
        }

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..std::mem::zeroed()
        };

        let mut processes = Vec::new();
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&ch| ch == 0)
                    .unwrap_or(entry.szExeFile.len());
                let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]);
                if !exe_name.is_empty() && window_pids.contains(&entry.th32ProcessID) {
                    processes.push(ActiveProcess {
                        pid: entry.th32ProcessID,
                        exe_name,
                    });
                }

                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
        Ok(processes)
    }
}

#[cfg(not(target_os = "windows"))]
fn collect_processes() -> Result<Vec<ActiveProcess>, String> {
    Ok(Vec::new())
}

#[tauri::command]
fn get_active_processes(query: Option<String>) -> Result<Vec<ActiveProcess>, String> {
    let normalized = query.unwrap_or_default().trim().to_ascii_lowercase();

    let mut processes = collect_processes()?;
    if !normalized.is_empty() {
        processes.retain(|proc| proc.exe_name.to_ascii_lowercase().contains(&normalized));
    }

    processes.sort_by(|a, b| a.exe_name.cmp(&b.exe_name));
    let mut seen = HashSet::new();
    processes.retain(|p| seen.insert(p.exe_name.to_ascii_lowercase()));

    Ok(processes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    db::init_db().expect("failed to initialize sqlite database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(EngineState {
            running: Arc::new(AtomicBool::new(false)),
        })
        .setup(|app| {
            let handle = app.handle();
            if let Ok(settings) = db::get_settings() {
                if let Some(active) = settings.values.get("activeProfile") {
                    let _ = handle.emit("active-profile-changed", active);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_engine,
            stop_engine,
            get_profiles,
            save_profile,
            create_profile,
            rename_profile,
            delete_profile,
            duplicate_profile,
            set_active_profile,
            get_settings,
            save_setting,
            get_connected_gamepads,
            get_active_processes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
