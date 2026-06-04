use crate::db;
use crate::models::SavedWindowState;
use tauri::{PhysicalPosition, PhysicalSize, Position, Size};

pub fn load_saved_window_state() -> Option<SavedWindowState> {
    let raw = db::get_settings()
        .ok()
        .and_then(|s| s.values.get("windowState").cloned())?;

    serde_json::from_str::<SavedWindowState>(&raw).ok()
}

pub fn save_window_state(window: &tauri::WebviewWindow) -> Result<(), String> {
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let state = SavedWindowState {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
    };
    let raw = serde_json::to_string(&state).map_err(|e| e.to_string())?;
    db::save_setting("windowState", &raw)
}

pub fn state_visible_on_any_monitor(
    window: &tauri::WebviewWindow,
    state: &SavedWindowState,
) -> bool {
    let Ok(monitors) = window.available_monitors() else {
        return false;
    };

    let center_x = state.x + (state.width as i32 / 2);
    let center_y = state.y + (state.height as i32 / 2);

    monitors.into_iter().any(|monitor| {
        let pos = monitor.position();
        let size = monitor.size();
        let left = pos.x;
        let top = pos.y;
        let right = pos.x + size.width as i32;
        let bottom = pos.y + size.height as i32;

        center_x >= left && center_x < right && center_y >= top && center_y < bottom
    })
}

pub fn restore_window_state(window: &tauri::WebviewWindow) -> Result<(), String> {
    let Some(state) = load_saved_window_state() else {
        return Ok(());
    };

    let size = Size::Physical(PhysicalSize {
        width: state.width,
        height: state.height,
    });
    window.set_size(size).map_err(|e| e.to_string())?;

    if state_visible_on_any_monitor(window, &state) {
        let pos = Position::Physical(PhysicalPosition {
            x: state.x,
            y: state.y,
        });
        window.set_position(pos).map_err(|e| e.to_string())?;
    } else {
        window.center().map_err(|e| e.to_string())?;
    }

    Ok(())
}
