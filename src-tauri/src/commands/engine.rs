use crate::db::{self, Profile};
use crate::input_sim;
use crate::models::{EngineState, GamepadAxisState, GamepadButtonState};
use crate::monitor;
use crate::utils::settings_helper;
use gilrs::{Axis, Button, EventType, GamepadId, Gilrs};
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::XboxController::{
    XInputGetState, XINPUT_GAMEPAD_A, XINPUT_GAMEPAD_B, XINPUT_GAMEPAD_BACK,
    XINPUT_GAMEPAD_DPAD_DOWN, XINPUT_GAMEPAD_DPAD_LEFT, XINPUT_GAMEPAD_DPAD_RIGHT,
    XINPUT_GAMEPAD_DPAD_UP, XINPUT_GAMEPAD_LEFT_SHOULDER, XINPUT_GAMEPAD_LEFT_THUMB,
    XINPUT_GAMEPAD_RIGHT_SHOULDER, XINPUT_GAMEPAD_RIGHT_THUMB, XINPUT_GAMEPAD_START,
    XINPUT_GAMEPAD_X, XINPUT_GAMEPAD_Y, XINPUT_STATE,
};

static LAST_TRIGGER_TIMES: OnceLock<Mutex<HashMap<i64, Instant>>> = OnceLock::new();
const LEFT_STICK_MOTION_ID: i64 = 100;
const RIGHT_STICK_MOTION_ID: i64 = 101;

#[derive(Clone, Default)]
struct AnalogKeyState {
    up: Option<String>,
    left: Option<String>,
    down: Option<String>,
    right: Option<String>,
}

#[derive(Clone, Default)]
struct MouseAccumulator {
    x: f32,
    y: f32,
}

#[derive(Clone, Default)]
struct AnalogRuntimeState {
    left_keys: AnalogKeyState,
    right_keys: AnalogKeyState,
    left_mouse: MouseAccumulator,
    right_mouse: MouseAccumulator,
}

#[derive(Clone)]
struct AnalogKeyboardMapping {
    up: String,
    left: String,
    down: String,
    right: String,
}

#[derive(Clone)]
struct MouseMoveMapping {
    sensitivity: f32,
}

fn get_active_profile() -> Option<Profile> {
    let active_profile = db::get_settings()
        .ok()
        .and_then(|settings| settings.values.get("activeProfile").cloned())
        .unwrap_or_else(|| "Default".to_string());

    db::get_profiles().ok().and_then(|profiles| {
        profiles
            .into_iter()
            .find(|profile| profile.name == active_profile)
    })
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

fn parse_analog_keyboard_mapping(value: &str) -> AnalogKeyboardMapping {
    let mut parts = value
        .split('|')
        .map(|part| part.trim().to_ascii_uppercase())
        .collect::<Vec<_>>();
    while parts.len() < 4 {
        parts.push(String::new());
    }

    AnalogKeyboardMapping {
        up: if parts[0].is_empty() {
            "W".to_string()
        } else {
            parts[0].clone()
        },
        left: if parts[1].is_empty() {
            "A".to_string()
        } else {
            parts[1].clone()
        },
        down: if parts[2].is_empty() {
            "S".to_string()
        } else {
            parts[2].clone()
        },
        right: if parts[3].is_empty() {
            "D".to_string()
        } else {
            parts[3].clone()
        },
    }
}

fn parse_mouse_move_mapping(value: &str) -> MouseMoveMapping {
    let sensitivity = value
        .trim()
        .parse::<f32>()
        .ok()
        .filter(|value| *value > 0.0)
        .unwrap_or(18.0);
    MouseMoveMapping { sensitivity }
}

fn apply_deadzone(value: f32, deadzone: f32) -> f32 {
    if value.abs() < deadzone {
        0.0
    } else {
        value
    }
}

fn update_direction_key(
    key: &str,
    should_press: bool,
    pressed_key: &mut Option<String>,
    app: &AppHandle,
) {
    if key == "NONE" || key.is_empty() {
        if let Some(previous) = pressed_key.clone() {
            update_direction_key(&previous, false, pressed_key, app);
        }
        return;
    }

    if should_press {
        if pressed_key.as_deref() == Some(key) {
            return;
        }

        if let Some(previous) = pressed_key.clone() {
            update_direction_key(&previous, false, pressed_key, app);
        }

        let Some(vk) = input_sim::key_to_vk(key) else {
            settings_helper::emit_engine_log(app, format!("Unsupported analog key '{key}'"), false);
            return;
        };

        if let Err(err) = input_sim::key_down(vk) {
            settings_helper::emit_engine_log(app, format!("Analog input failed: {err}"), false);
        } else {
            *pressed_key = Some(key.to_string());
        }
        return;
    }

    let Some(current_key) = pressed_key.clone() else {
        return;
    };

    let Some(vk) = input_sim::key_to_vk(&current_key) else {
        *pressed_key = None;
        return;
    };

    if let Err(err) = input_sim::key_up(vk) {
        settings_helper::emit_engine_log(app, format!("Analog input failed: {err}"), false);
    } else {
        *pressed_key = None;
    }
}

fn release_analog_keys(state: &mut AnalogKeyState, app: &AppHandle) {
    update_direction_key("", false, &mut state.up, app);
    update_direction_key("", false, &mut state.left, app);
    update_direction_key("", false, &mut state.down, app);
    update_direction_key("", false, &mut state.right, app);
}

fn process_analog_keyboard_mapping(
    x: f32,
    y: f32,
    deadzone: f32,
    mapping: &AnalogKeyboardMapping,
    state: &mut AnalogKeyState,
    app: &AppHandle,
) {
    let threshold = deadzone.max(0.35);
    update_direction_key(&mapping.up, y <= -threshold, &mut state.up, app);
    update_direction_key(&mapping.left, x <= -threshold, &mut state.left, app);
    update_direction_key(&mapping.down, y >= threshold, &mut state.down, app);
    update_direction_key(&mapping.right, x >= threshold, &mut state.right, app);
}

fn process_mouse_move_mapping(
    x: f32,
    y: f32,
    deadzone: f32,
    mapping: &MouseMoveMapping,
    accumulator: &mut MouseAccumulator,
    app: &AppHandle,
) {
    let x = apply_deadzone(x, deadzone);
    let y = apply_deadzone(y, deadzone);
    accumulator.x += x * mapping.sensitivity * 0.5;
    accumulator.y += y * mapping.sensitivity * 0.5;

    let dx = accumulator.x.trunc() as i32;
    let dy = accumulator.y.trunc() as i32;
    accumulator.x -= dx as f32;
    accumulator.y -= dy as f32;

    if let Err(err) = input_sim::move_mouse(dx, dy) {
        settings_helper::emit_engine_log(app, format!("Mouse move failed: {err}"), false);
    }
}

fn process_stick_mapping(
    control_id: i64,
    x: f32,
    y: f32,
    profile: &Profile,
    runtime: &mut AnalogRuntimeState,
    app: &AppHandle,
) {
    let Some(mapping) = profile
        .mappings
        .iter()
        .find(|mapping| mapping.button_id == control_id)
    else {
        if control_id == LEFT_STICK_MOTION_ID {
            release_analog_keys(&mut runtime.left_keys, app);
            runtime.left_mouse = MouseAccumulator::default();
        } else {
            release_analog_keys(&mut runtime.right_keys, app);
            runtime.right_mouse = MouseAccumulator::default();
        }
        return;
    };

    let deadzone = profile.axis_deadzone.clamp(0.0, 1.0) as f32;
    let key_state = if control_id == LEFT_STICK_MOTION_ID {
        &mut runtime.left_keys
    } else {
        &mut runtime.right_keys
    };
    let mouse_state = if control_id == LEFT_STICK_MOTION_ID {
        &mut runtime.left_mouse
    } else {
        &mut runtime.right_mouse
    };

    match mapping.mapping_type.as_str() {
        "AnalogKeyboard" => {
            *mouse_state = MouseAccumulator::default();
            let analog = parse_analog_keyboard_mapping(&mapping.key_str);
            process_analog_keyboard_mapping(x, y, deadzone, &analog, key_state, app);
        }
        "MouseMove" => {
            let analog = parse_mouse_move_mapping(&mapping.key_str);
            release_analog_keys(key_state, app);
            process_mouse_move_mapping(x, y, deadzone, &analog, mouse_state, app);
        }
        _ => {
            release_analog_keys(key_state, app);
            *mouse_state = MouseAccumulator::default();
        }
    }
}

fn process_analog_mappings(
    axes: &[f32; 4],
    profile: Option<&Profile>,
    runtime: &mut AnalogRuntimeState,
    app: &AppHandle,
) {
    if settings_helper::is_own_window_focused() {
        release_analog_keys(&mut runtime.left_keys, app);
        release_analog_keys(&mut runtime.right_keys, app);
        runtime.left_mouse = MouseAccumulator::default();
        runtime.right_mouse = MouseAccumulator::default();
        return;
    }

    let Some(profile) = profile else {
        return;
    };

    process_stick_mapping(
        LEFT_STICK_MOTION_ID,
        axes[0],
        axes[1],
        profile,
        runtime,
        app,
    );
    process_stick_mapping(
        RIGHT_STICK_MOTION_ID,
        axes[2],
        axes[3],
        profile,
        runtime,
        app,
    );
}

fn trigger_mapping_action_with_profile(button_id: i64, app: &AppHandle, profile: &Profile) {
    if settings_helper::is_own_window_focused() {
        settings_helper::emit_engine_log(
            app,
            format!("Remap blocked in-app focus: button={button_id}"),
            true,
        );
        return;
    }

    if !allow_by_debounce(button_id, profile.debounce_ms) {
        settings_helper::emit_engine_log(
            app,
            format!(
                "Remap blocked by debounce: button={button_id}, debounce_ms={}",
                profile.debounce_ms
            ),
            true,
        );
        return;
    }

    settings_helper::emit_engine_log(
        app,
        format!(
            "Remap lookup: button={button_id}, active_profile={}",
            profile.name
        ),
        true,
    );

    let Some(mapping) = profile
        .mappings
        .iter()
        .find(|mapping| mapping.button_id == button_id)
        .cloned()
    else {
        settings_helper::emit_engine_log(
            app,
            format!("Remap skipped: no mapping for button={button_id}"),
            true,
        );
        return;
    };

    settings_helper::emit_engine_log(
        app,
        format!(
            "Remap matched: button={} -> key='{}' type={}",
            button_id, mapping.key_str, mapping.mapping_type
        ),
        true,
    );

    if !mapping.mapping_type.eq_ignore_ascii_case("keyboard") {
        settings_helper::emit_engine_log(
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
        settings_helper::emit_engine_log(
            app,
            format!("Injecting key: '{}' (vk={vk})", mapping.key_str),
            true,
        );
        if let Err(err) = input_sim::tap_key(vk) {
            settings_helper::emit_engine_log(app, format!("Injection failed: {err}"), false);
        } else if settings_helper::is_developer_mode_enabled() {
            settings_helper::emit_engine_log(app, "Injection success", true);
        }
    } else {
        settings_helper::emit_engine_log(
            app,
            format!("Remap skipped: unsupported key '{}'", mapping.key_str),
            false,
        );
    }
}

fn trigger_mapping_action(button_id: i64, app: &AppHandle) {
    if settings_helper::is_own_window_focused() {
        settings_helper::emit_engine_log(
            app,
            format!("Remap blocked in-app focus: button={button_id}"),
            true,
        );
        return;
    }

    let Some(profile) = get_active_profile() else {
        settings_helper::emit_engine_log(app, "Remap skipped: active profile not found", false);
        return;
    };
    let active_profile = profile.name.clone();

    if !allow_by_debounce(button_id, profile.debounce_ms) {
        settings_helper::emit_engine_log(
            app,
            format!(
                "Remap blocked by debounce: button={button_id}, debounce_ms={}",
                profile.debounce_ms
            ),
            true,
        );
        return;
    }

    settings_helper::emit_engine_log(
        app,
        format!("Remap lookup: button={button_id}, active_profile={active_profile}"),
        true,
    );

    let Some(mapping) = profile
        .mappings
        .into_iter()
        .find(|mapping| mapping.button_id == button_id)
    else {
        settings_helper::emit_engine_log(
            app,
            format!("Remap skipped: no mapping for button={button_id}"),
            true,
        );
        return;
    };

    settings_helper::emit_engine_log(
        app,
        format!(
            "Remap matched: button={} -> key='{}' type={}",
            button_id, mapping.key_str, mapping.mapping_type
        ),
        true,
    );

    if !mapping.mapping_type.eq_ignore_ascii_case("keyboard") {
        settings_helper::emit_engine_log(
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
        settings_helper::emit_engine_log(
            app,
            format!("Injecting key: '{}' (vk={vk})", mapping.key_str),
            true,
        );
        if let Err(err) = input_sim::tap_key(vk) {
            settings_helper::emit_engine_log(app, format!("Injection failed: {err}"), false);
        } else if settings_helper::is_developer_mode_enabled() {
            settings_helper::emit_engine_log(app, "Injection success", true);
        }
    } else {
        settings_helper::emit_engine_log(
            app,
            format!("Remap skipped: unsupported key '{}'", mapping.key_str),
            false,
        );
    }
}

#[tauri::command]
pub fn start_engine(app: AppHandle, engine: State<'_, EngineState>) -> Result<(), String> {
    if engine.running.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let running = Arc::clone(&engine.running);
    let app_handle = app.clone();

    thread::spawn(move || {
        let mut gilrs = match Gilrs::new() {
            Ok(gilrs) => gilrs,
            Err(err) => {
                settings_helper::emit_engine_log(
                    &app_handle,
                    format!("Failed to initialize gilrs: {err}"),
                    false,
                );
                return;
            }
        };

        settings_helper::emit_engine_log(
            &app_handle,
            "Input monitoring initialized at 1000Hz",
            false,
        );
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
        let mut cached_profile = get_active_profile();
        let mut last_profile_refresh = Instant::now();
        let mut axis_state = [0.0_f32; 4];
        let mut analog_runtime = AnalogRuntimeState::default();
        let mut last_analog_tick = Instant::now();

        while running.load(Ordering::Relaxed) {
            if last_profile_refresh.elapsed() >= Duration::from_millis(250) {
                cached_profile = get_active_profile();
                last_profile_refresh = Instant::now();
            }

            while let Some(event) = gilrs.next_event() {
                match event.event {
                    EventType::ButtonPressed(button, _) => {
                        let button_id = button_to_id(button);
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id,
                                pressed: true,
                            },
                        );
                        if let Some(profile) = cached_profile.as_ref() {
                            trigger_mapping_action_with_profile(button_id, &app_handle, profile);
                        } else {
                            trigger_mapping_action(button_id, &app_handle);
                        }
                    }
                    EventType::ButtonReleased(button, _) => {
                        let button_id = button_to_id(button);
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id,
                                pressed: false,
                            },
                        );
                    }
                    EventType::ButtonChanged(button, value, _) => {
                        let profile_deadzone = cached_profile
                            .as_ref()
                            .map(|profile| profile.axis_deadzone)
                            .unwrap_or(0.0)
                            .clamp(0.0, 1.0) as f32;
                        let press_threshold = profile_deadzone.max(0.5);
                        let release_threshold = (press_threshold - 0.2).max(0.2);
                        let was_pressed = *changed_button_state.get(&button).unwrap_or(&false);
                        let is_pressed = value >= press_threshold;
                        let is_released = value <= release_threshold;

                        if is_pressed && !was_pressed {
                            changed_button_state.insert(button, true);
                            let button_id = button_to_id(button);
                            let _ = app_handle.emit(
                                "gamepad-button-state",
                                GamepadButtonState {
                                    button_id,
                                    pressed: true,
                                },
                            );
                            if let Some(profile) = cached_profile.as_ref() {
                                trigger_mapping_action_with_profile(
                                    button_id,
                                    &app_handle,
                                    profile,
                                );
                            } else {
                                trigger_mapping_action(button_id, &app_handle);
                            }
                        } else if is_released && was_pressed {
                            changed_button_state.insert(button, false);
                            let button_id = button_to_id(button);
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
                            let value = if axis_id == 1 || axis_id == 3 {
                                -value
                            } else {
                                value
                            };
                            axis_state[axis_id as usize] = value;
                            let _ = app_handle
                                .emit("gamepad-axis-state", GamepadAxisState { axis_id, value });
                        }
                    }
                    _ => {}
                }
            }

            for (id, gamepad) in gilrs.gamepads() {
                if !gamepad.is_connected() {
                    continue;
                }

                for button in poll_buttons {
                    let pressed_now = gamepad.is_pressed(button);
                    let key = (id, button);
                    let pressed_prev = polled_button_state.get(&key).copied().unwrap_or(false);
                    if pressed_now != pressed_prev {
                        polled_button_state.insert(key, pressed_now);
                        let button_id = button_to_id(button);
                        let _ = app_handle.emit(
                            "gamepad-button-state",
                            GamepadButtonState {
                                button_id,
                                pressed: pressed_now,
                            },
                        );

                        if pressed_now {
                            settings_helper::emit_engine_log(
                                &app_handle,
                                format!("Polled press detected: pad={id:?}, button={button_id}"),
                                true,
                            );
                            if let Some(profile) = cached_profile.as_ref() {
                                trigger_mapping_action_with_profile(
                                    button_id,
                                    &app_handle,
                                    profile,
                                );
                            } else {
                                trigger_mapping_action(button_id, &app_handle);
                            }
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
                    let profile_deadzone = cached_profile
                        .as_ref()
                        .map(|profile| profile.axis_deadzone)
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
                            if let Some(profile) = cached_profile.as_ref() {
                                trigger_mapping_action_with_profile(
                                    button_id as i64,
                                    &app_handle,
                                    profile,
                                );
                            } else {
                                trigger_mapping_action(button_id as i64, &app_handle);
                            }
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
                            axis_state[axis_id] = now_val;
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

            if last_analog_tick.elapsed() >= Duration::from_millis(8) {
                process_analog_mappings(
                    &axis_state,
                    cached_profile.as_ref(),
                    &mut analog_runtime,
                    &app_handle,
                );
                last_analog_tick = Instant::now();
            }

            thread::sleep(Duration::from_millis(1));
        }

        process_analog_mappings(&[0.0; 4], cached_profile.as_ref(), &mut analog_runtime, &app_handle);
    });

    monitor::spawn_monitor(app, Arc::clone(&engine.running));
    Ok(())
}

#[tauri::command]
pub fn stop_engine(engine: State<'_, EngineState>) -> Result<(), String> {
    engine.running.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn trigger_button_action(app: AppHandle, button_id: i64) -> Result<(), String> {
    settings_helper::emit_engine_log(
        &app,
        format!("Frontend fallback trigger: button={button_id}"),
        true,
    );
    trigger_mapping_action(button_id, &app);
    Ok(())
}
