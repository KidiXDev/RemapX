use crate::models::AppRuntimeState;
use std::sync::atomic::Ordering;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Position, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};

pub const TRAY_POPUP_LABEL: &str = "tray-popup";
const TRAY_POPUP_WIDTH: f64 = 340.0;
const TRAY_POPUP_HEIGHT: f64 = 420.0;

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

pub fn ensure_tray_popup_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(TRAY_POPUP_LABEL) {
        return Ok(window);
    }

    let window = WebviewWindowBuilder::new(
        app,
        TRAY_POPUP_LABEL,
        WebviewUrl::App("index.html".into()),
    )
    .title("RemapX Tray")
    .visible(false)
    .focused(false)
    .decorations(false)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .closable(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .transparent(true)
    .shadow(false)
    .inner_size(TRAY_POPUP_WIDTH, TRAY_POPUP_HEIGHT)
    .build()
    .map_err(|e| e.to_string())?;

    let _ = window.set_shadow(false);

    let tray_popup = window.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::Focused(false) => {
            let _ = tray_popup.hide();
        }
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            let _ = tray_popup.hide();
        }
        _ => {}
    });

    Ok(window)
}

pub fn hide_tray_popup(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(TRAY_POPUP_LABEL) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn position_tray_popup(window: &WebviewWindow, anchor: PhysicalPosition<f64>) -> Result<(), String> {
    let mut x = anchor.x - TRAY_POPUP_WIDTH + 18.0;
    let mut y = anchor.y - TRAY_POPUP_HEIGHT - 10.0;

    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .or_else(|| app_main_monitor(window.app_handle()));

    if let Some(monitor) = monitor {
        let work_area = monitor.work_area();
        let min_x = work_area.position.x as f64 + 8.0;
        let min_y = work_area.position.y as f64 + 8.0;
        let max_x = work_area.position.x as f64 + work_area.size.width as f64 - TRAY_POPUP_WIDTH - 8.0;
        let max_y = work_area.position.y as f64 + work_area.size.height as f64 - TRAY_POPUP_HEIGHT - 8.0;

        if y < min_y {
            y = (anchor.y + 12.0).min(max_y);
        }

        x = x.clamp(min_x, max_x.max(min_x));
        y = y.clamp(min_y, max_y.max(min_y));
    }

    window
        .set_position(Position::Physical(PhysicalPosition::new(
            x.round() as i32,
            y.round() as i32,
        )))
        .map_err(|e| e.to_string())
}

fn app_main_monitor(app: &AppHandle) -> Option<tauri::Monitor> {
    app.get_webview_window("main")
        .and_then(|main| main.current_monitor().ok().flatten())
}

pub fn toggle_tray_popup(app: &AppHandle, anchor: PhysicalPosition<f64>) -> Result<(), String> {
    let window = ensure_tray_popup_window(app)?;

    if window.is_visible().map_err(|e| e.to_string())? {
        return window.hide().map_err(|e| e.to_string());
    }

    position_tray_popup(&window, anchor)?;
    let _ = app.emit("tray-popup-opened", ());
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> Result<(), String> {
    let _ = hide_tray_popup(&app);
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

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
