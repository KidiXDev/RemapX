use serde::{Deserialize, Serialize};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct EngineState {
    pub running: Arc<AtomicBool>,
}

pub struct AppRuntimeState {
    pub skip_initial_show: AtomicBool,
}

#[derive(Clone, Serialize)]
pub struct GamepadButtonState {
    pub button_id: i64,
    pub pressed: bool,
}

#[derive(Clone, Serialize)]
pub struct GamepadAxisState {
    pub axis_id: u8,
    pub value: f32,
}

#[derive(Clone, Serialize)]
pub struct EngineLog {
    pub message: String,
}

#[derive(Clone, Serialize)]
pub struct RuntimeInfo {
    pub is_portable: bool,
}

#[derive(Clone, Serialize)]
pub struct ConnectedGamepad {
    pub id: String,
    pub name: String,
}

#[derive(Clone, Serialize)]
pub struct ActiveProcess {
    pub pid: u32,
    pub exe_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedWindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}
