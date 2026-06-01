mod db;
mod input_sim;
mod monitor;

use db::{Profile, SettingsPayload};
use gilrs::{Button, EventType, Gilrs};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

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
            delete_profile,
            duplicate_profile,
            set_active_profile,
            get_settings,
            save_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
