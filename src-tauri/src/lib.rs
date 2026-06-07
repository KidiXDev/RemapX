mod commands;
mod db;
mod input_sim;
mod models;
mod monitor;
mod utils;

use crate::models::{AppRuntimeState, EngineState};
use crate::utils::{settings_helper, single_instance, window_state};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tauri::{Emitter, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if !single_instance::acquire().expect("failed to initialize single-instance lock") {
        return;
    }

    db::init_db().expect("failed to initialize sqlite database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppRuntimeState {
            skip_initial_show: AtomicBool::new(settings_helper::should_start_hidden_on_launch()),
        })
        .manage(EngineState {
            running: Arc::new(AtomicBool::new(false)),
        })
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "Show RemapX").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let tray_menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;
            let tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        let _ = commands::window::reveal_main_window(app, false);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let _ = commands::window::reveal_main_window(&app, false);
                    }
                });

            let tray_builder = if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder.icon(icon)
            } else {
                tray_builder
            };

            let _tray = tray_builder.build(app)?;

            let handle = app.handle();
            if let Some(main) = app.get_webview_window("main") {
                let _ = window_state::restore_window_state(&main);
                let main_for_events = main.clone();
                let last_save_at = Arc::new(Mutex::new(Instant::now()));
                let last_save_at_for_events = Arc::clone(&last_save_at);
                main.on_window_event(move |event| match event {
                    WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                        if let Ok(mut last) = last_save_at_for_events.lock() {
                            if last.elapsed() >= Duration::from_millis(500) {
                                let _ = window_state::save_window_state(&main_for_events);
                                *last = Instant::now();
                            }
                        }
                    }
                    WindowEvent::CloseRequested { api, .. } => {
                        let _ = window_state::save_window_state(&main_for_events);
                        if settings_helper::should_minimize_to_tray() {
                            api.prevent_close();
                            let _ = main_for_events.hide();
                        }
                    }
                    _ => {}
                });
            }
            if let Ok(settings) = db::get_settings() {
                if let Some(active) = settings.values.get("activeProfile") {
                    let _ = handle.emit("active-profile-changed", active);
                }
            }
            single_instance::start_activation_listener(handle.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::engine::start_engine,
            commands::engine::stop_engine,
            commands::engine::trigger_button_action,
            commands::window::show_main_window,
            commands::window::open_main_devtools,
            commands::system::get_runtime_info,
            commands::settings::set_run_on_boot,
            commands::profile::get_profiles,
            commands::profile::save_profile,
            commands::profile::create_profile,
            commands::profile::rename_profile,
            commands::profile::delete_profile,
            commands::profile::duplicate_profile,
            commands::profile::set_active_profile,
            commands::profile::export_profile,
            commands::profile::import_profile,
            commands::settings::get_settings,
            commands::settings::save_setting,
            commands::system::get_connected_gamepads,
            commands::system::get_active_processes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
