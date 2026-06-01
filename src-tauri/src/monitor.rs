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

pub fn spawn_monitor(app: AppHandle, running: Arc<AtomicBool>) {
    thread::spawn(move || {
        let mut last = String::new();

        while running.load(Ordering::Relaxed) {
            if let Some(exe_name) = current_foreground_exe() {
                if exe_name != last {
                    if let Ok(profiles) = db::get_profiles() {
                        for p in profiles {
                            if !p.target_exe.is_empty()
                                && p.target_exe.eq_ignore_ascii_case(&exe_name)
                            {
                                let _ = db::save_setting("activeProfile", &p.name);
                                let _ = app.emit("active-profile-changed", &p.name);
                                last = exe_name.clone();
                                break;
                            }
                        }
                    }
                }
            }

            thread::sleep(Duration::from_millis(1500));
        }
    });
}
