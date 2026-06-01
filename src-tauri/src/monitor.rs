use crate::db;
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::CloseHandle;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

#[cfg(target_os = "windows")]
fn current_foreground_exe() -> Option<String> {
    use windows_sys::Win32::Foundation::MAX_PATH;
    use windows_sys::Win32::System::Threading::QueryFullProcessImageNameW;

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }

        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return None;
        }

        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if process.is_null() {
            return None;
        }

        let mut buffer = [0u16; MAX_PATH as usize];
        let mut size = buffer.len() as u32;
        let ok = QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut size);
        CloseHandle(process);

        if ok == 0 || size == 0 {
            return None;
        }

        let path = String::from_utf16_lossy(&buffer[..size as usize]);
        Path::new(&path)
            .file_name()
            .and_then(|f| f.to_str())
            .map(|s| s.to_ascii_lowercase())
    }
}

#[cfg(not(target_os = "windows"))]
fn current_foreground_exe() -> Option<String> {
    None
}

fn targets_from_field(raw: &str) -> Vec<String> {
    raw.split(|ch| ch == ',' || ch == ';' || ch == '\n')
        .map(|item| item.trim().to_ascii_lowercase())
        .filter(|item| !item.is_empty())
        .collect()
}

pub fn spawn_monitor(app: AppHandle, running: Arc<AtomicBool>) {
    thread::spawn(move || {
        let mut last_exe = String::new();
        let mut last_profile = String::new();

        while running.load(Ordering::Relaxed) {
            if let Some(exe_name) = current_foreground_exe() {
                if exe_name != last_exe {
                    if let Ok(profiles) = db::get_profiles() {
                        let current_active = db::get_settings()
                            .ok()
                            .and_then(|settings| settings.values.get("activeProfile").cloned())
                            .unwrap_or_default();

                        let mut matched_profile: Option<String> = None;
                        let mut first_global_profile: Option<String> = None;

                        for profile in profiles {
                            let targets = targets_from_field(&profile.target_exe);
                            if targets.is_empty() && first_global_profile.is_none() {
                                first_global_profile = Some(profile.name.clone());
                            }

                            if targets.iter().any(|target| target == &exe_name) {
                                matched_profile = Some(profile.name.clone());
                                break;
                            }
                        }

                        let next_profile = if let Some(explicit) = matched_profile {
                            explicit
                        } else {
                            let active_is_global = db::get_profiles()
                                .ok()
                                .and_then(|items| {
                                    items.into_iter().find(|profile| profile.name == current_active)
                                })
                                .map(|profile| targets_from_field(&profile.target_exe).is_empty())
                                .unwrap_or(false);

                            if active_is_global {
                                current_active
                            } else {
                                first_global_profile.unwrap_or(current_active)
                            }
                        };

                        if !next_profile.is_empty() && next_profile != last_profile {
                            let _ = db::save_setting("activeProfile", &next_profile);
                            let _ = app.emit("active-profile-changed", &next_profile);
                            last_profile = next_profile;
                        }
                        last_exe = exe_name;
                    }
                }
            }

            thread::sleep(Duration::from_millis(1500));
        }
    });
}
