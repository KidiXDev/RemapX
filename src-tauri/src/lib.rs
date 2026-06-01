mod db;
mod input_sim;
mod monitor;

use db::{Profile, SettingsPayload};
use gilrs::{Axis, Button, EventType, GamepadId, Gilrs};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Threading::GetCurrentProcessId;
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::XboxController::{
    XInputGetState, XINPUT_GAMEPAD_A, XINPUT_GAMEPAD_B, XINPUT_GAMEPAD_BACK, XINPUT_GAMEPAD_DPAD_DOWN,
    XINPUT_GAMEPAD_DPAD_LEFT, XINPUT_GAMEPAD_DPAD_RIGHT, XINPUT_GAMEPAD_DPAD_UP, XINPUT_GAMEPAD_LEFT_SHOULDER,
    XINPUT_GAMEPAD_LEFT_THUMB, XINPUT_GAMEPAD_RIGHT_SHOULDER, XINPUT_GAMEPAD_RIGHT_THUMB, XINPUT_GAMEPAD_START,
    XINPUT_GAMEPAD_X, XINPUT_GAMEPAD_Y, XINPUT_STATE,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{CloseHandle, HWND, INVALID_HANDLE_VALUE, LPARAM};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowTextLengthW, IsWindowVisible,
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
struct GamepadAxisState {
    axis_id: u8,
    value: f32,
}

#[derive(Clone, Serialize)]
struct EngineLog {
    message: String,
}

fn is_developer_mode_enabled() -> bool {
    db::get_settings()
        .ok()
        .and_then(|s| s.values.get("developerMode").cloned())
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn emit_engine_log(app: &AppHandle, message: impl Into<String>, verbose: bool) {
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
fn is_own_window_focused() -> bool {
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
fn is_own_window_focused() -> bool {
    false
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

static LAST_TRIGGER_TIMES: OnceLock<Mutex<HashMap<i64, Instant>>> = OnceLock::new();

fn get_active_profile() -> Option<Profile> {
    let active_profile = db::get_settings()
        .ok()
        .and_then(|s| s.values.get("activeProfile").cloned())
        .unwrap_or_else(|| "Default".to_string());

    db::get_profiles()
        .ok()
        .and_then(|profiles| profiles.into_iter().find(|p| p.name == active_profile))
}

fn allow_by_debounce(button_id: i64, debounce_ms: i64) -> bool {
    let debounce_ms = debounce_ms.max(0) as u64;
    if debounce_ms == 0 {
        return true;
    }

    let now = Instant::now();
    let map = LAST_TRIGGER_TIMES.get_or_init(|| Mutex::new(HashMap::new()));
    if let Ok(mut guard) = map.lock() {
        if let Some(last) = guard.get(&button_id) {
            if now.duration_since(*last).as_millis() < debounce_ms as u128 {
                return false;
            }
        }
        guard.insert(button_id, now);
        return true;
    }
    true
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

        emit_engine_log(&app_handle, "Input monitoring initialized at 1000Hz", false);
        // Some controllers report digital buttons via ButtonChanged instead of
        // ButtonPressed/ButtonReleased. Track synthetic press state per button.
        let mut changed_button_state: HashMap<Button, bool> = HashMap::new();
        let poll_buttons = [
            Button::South,
            Button::East,
            Button::West,
            Button::North,
            Button::LeftTrigger,
            Button::RightTrigger,
            Button::LeftTrigger2,
            Button::RightTrigger2,
            Button::Select,
            Button::Start,
            Button::Mode,
            Button::LeftThumb,
            Button::RightThumb,
            Button::DPadUp,
            Button::DPadDown,
            Button::DPadLeft,
            Button::DPadRight,
        ];
        let mut polled_button_state: HashMap<(GamepadId, Button), bool> = HashMap::new();
        #[cfg(target_os = "windows")]
        let mut xinput_prev: [[bool; 17]; 4] = [[false; 17]; 4];
        #[cfg(target_os = "windows")]
        let mut xinput_axes_prev: [[f32; 4]; 4] = [[0.0; 4]; 4];

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
                        trigger_mapping_action(button_id, &app_handle);
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
                    EventType::ButtonChanged(btn, value, _) => {
                        let profile_deadzone = get_active_profile()
                            .map(|p| p.axis_deadzone)
                            .unwrap_or(0.0)
                            .clamp(0.0, 1.0) as f32;
                        let press_threshold = profile_deadzone.max(0.5);
                        let release_threshold = (press_threshold - 0.2).max(0.2);
                        let was_pressed = *changed_button_state.get(&btn).unwrap_or(&false);
                        let is_pressed = value >= press_threshold;
                        let is_released = value <= release_threshold;

                        if is_pressed && !was_pressed {
                            changed_button_state.insert(btn, true);
                            let button_id = button_to_id(btn);
                            let _ = app_handle.emit(
                                "gamepad-button-state",
                                GamepadButtonState {
                                    button_id,
                                    pressed: true,
                                },
                            );
                            trigger_mapping_action(button_id, &app_handle);
                        } else if is_released && was_pressed {
                            changed_button_state.insert(btn, false);
                            let button_id = button_to_id(btn);
                            let _ = app_handle.emit(
                                "gamepad-button-state",
                                GamepadButtonState {
                                    button_id,
                                    pressed: false,
                                },
                            );
                        }
                    }
                    EventType::AxisChanged(axis, value, _) => {
                        let axis_id = axis_to_id(axis);
                        if axis_id != 99 {
                            let val = if axis_id == 1 || axis_id == 3 {
                                -value
                            } else {
                                value
                            };
                            let _ = app_handle.emit(
                                "gamepad-axis-state",
                                GamepadAxisState {
                                    axis_id,
                                    value: val,
                                },
                            );
                        }
                    }
                    _ => {}
                }
            }

            // Fallback polling path: some controller/drivers may not emit
            // button events reliably; poll pressed states and synthesize edges.
            for (id, gamepad) in gilrs.gamepads() {
                if !gamepad.is_connected() {
                    continue;
                }
                for btn in poll_buttons {
                    let pressed_now = gamepad.is_pressed(btn);
                    let key = (id, btn);
                    let pressed_prev = polled_button_state.get(&key).copied().unwrap_or(false);
                    if pressed_now != pressed_prev {
                        polled_button_state.insert(key, pressed_now);
                        let button_id = button_to_id(btn);
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id,
                                pressed: pressed_now,
                            },
                        );

                        if pressed_now {
                            emit_engine_log(
                                &app_handle,
                                format!("Polled press detected: pad={:?}, button={}", id, button_id),
                                true,
                            );
                            trigger_mapping_action(button_id, &app_handle);
                        }
                    }
                }
            }

            #[cfg(target_os = "windows")]
            {
                for (user_idx, prev_states) in xinput_prev.iter_mut().enumerate() {
                    let mut state = XINPUT_STATE::default();
                    let ok = unsafe { XInputGetState(user_idx as u32, &mut state) } == 0;
                    if !ok {
                        continue;
                    }

                    let buttons = state.Gamepad.wButtons;
                    let profile_deadzone = get_active_profile()
                        .map(|p| p.axis_deadzone)
                        .unwrap_or(0.0)
                        .clamp(0.0, 1.0);
                    let trigger_threshold = ((profile_deadzone * 255.0).round() as u8).max(30);
                    let left_trigger = state.Gamepad.bLeftTrigger >= trigger_threshold;
                    let right_trigger = state.Gamepad.bRightTrigger >= trigger_threshold;
                    let now = [
                        (buttons & XINPUT_GAMEPAD_A) != 0,
                        (buttons & XINPUT_GAMEPAD_B) != 0,
                        (buttons & XINPUT_GAMEPAD_X) != 0,
                        (buttons & XINPUT_GAMEPAD_Y) != 0,
                        (buttons & XINPUT_GAMEPAD_LEFT_SHOULDER) != 0,
                        (buttons & XINPUT_GAMEPAD_RIGHT_SHOULDER) != 0,
                        left_trigger,
                        right_trigger,
                        (buttons & XINPUT_GAMEPAD_BACK) != 0,
                        (buttons & XINPUT_GAMEPAD_START) != 0,
                        false,
                        (buttons & XINPUT_GAMEPAD_LEFT_THUMB) != 0,
                        (buttons & XINPUT_GAMEPAD_RIGHT_THUMB) != 0,
                        (buttons & XINPUT_GAMEPAD_DPAD_UP) != 0,
                        (buttons & XINPUT_GAMEPAD_DPAD_DOWN) != 0,
                        (buttons & XINPUT_GAMEPAD_DPAD_LEFT) != 0,
                        (buttons & XINPUT_GAMEPAD_DPAD_RIGHT) != 0,
                    ];

                    for button_id in 0..=16 {
                        if now[button_id] == prev_states[button_id] {
                            continue;
                        }
                        prev_states[button_id] = now[button_id];
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id: button_id as i64,
                                pressed: now[button_id],
                            },
                        );
                        if now[button_id] {
                            trigger_mapping_action(button_id as i64, &app_handle);
                        }
                    }

                    let lx = state.Gamepad.sThumbLX as f32 / 32768.0;
                    let ly = -(state.Gamepad.sThumbLY as f32 / 32768.0);
                    let rx = state.Gamepad.sThumbRX as f32 / 32768.0;
                    let ry = -(state.Gamepad.sThumbRY as f32 / 32768.0);
                    let axes_now = [lx, ly, rx, ry];

                    for axis_id in 0..4 {
                        let prev_val = xinput_axes_prev[user_idx][axis_id];
                        let now_val = axes_now[axis_id];
                        if (now_val - prev_val).abs() > 0.015 {
                            xinput_axes_prev[user_idx][axis_id] = now_val;
                            let _ = app_handle.emit(
                                "gamepad-axis-state",
                                GamepadAxisState {
                                    axis_id: axis_id as u8,
                                    value: now_val,
                                },
                            );
                        }
                    }
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

#[tauri::command]
fn trigger_button_action(app: AppHandle, button_id: i64) -> Result<(), String> {
    emit_engine_log(
        &app,
        format!("Frontend fallback trigger: button={button_id}"),
        true,
    );
    trigger_mapping_action(button_id, &app);
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

fn axis_to_id(axis: Axis) -> u8 {
    match axis {
        Axis::LeftStickX => 0,
        Axis::LeftStickY => 1,
        Axis::RightStickX => 2,
        Axis::RightStickY => 3,
        _ => 99,
    }
}

fn trigger_mapping_action(button_id: i64, app: &AppHandle) {
    if is_own_window_focused() {
        emit_engine_log(
            app,
            format!("Remap blocked in-app focus: button={button_id}"),
            true,
        );
        return;
    }

    let Some(profile) = get_active_profile() else {
        emit_engine_log(app, "Remap skipped: active profile not found", false);
        return;
    };
    let active_profile = profile.name.clone();

    if !allow_by_debounce(button_id, profile.debounce_ms) {
        emit_engine_log(
            app,
            format!(
                "Remap blocked by debounce: button={button_id}, debounce_ms={}",
                profile.debounce_ms
            ),
            true,
        );
        return;
    }
    emit_engine_log(
        app,
        format!("Remap lookup: button={button_id}, active_profile={active_profile}"),
        true,
    );

    let Some(mapping) = profile
        .mappings
        .into_iter()
        .find(|m| m.button_id == button_id)
    else {
        emit_engine_log(
            app,
            format!("Remap skipped: no mapping for button={button_id}"),
            true,
        );
        return;
    };

    emit_engine_log(
        app,
        format!(
            "Remap matched: button={} -> key='{}' type={}",
            button_id, mapping.key_str, mapping.mapping_type
        ),
        true,
    );

    if !mapping.mapping_type.eq_ignore_ascii_case("keyboard") {
        emit_engine_log(
            app,
            format!(
                "Remap skipped: mapping_type '{}' not implemented",
                mapping.mapping_type
            ),
            false,
        );
        return;
    }

    if let Some(vk) = input_sim::key_to_vk(&mapping.key_str) {
        emit_engine_log(
            app,
            format!("Injecting key: '{}' (vk={vk})", mapping.key_str),
            true,
        );
        if let Err(err) = input_sim::tap_key(vk) {
            emit_engine_log(app, format!("Injection failed: {err}"), false);
        } else if is_developer_mode_enabled() {
            emit_engine_log(app, "Injection success", true);
        }
    } else {
        emit_engine_log(
            app,
            format!("Remap skipped: unsupported key '{}'", mapping.key_str),
            false,
        );
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
            trigger_button_action,
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
