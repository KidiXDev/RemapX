use crate::models::{ActiveProcess, ConnectedGamepad, RuntimeInfo};
use crate::utils::settings_helper;
use gilrs::Gilrs;
use std::collections::HashSet;

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

#[tauri::command]
pub fn get_runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        is_portable: settings_helper::is_portable_build(),
    }
}

#[tauri::command]
pub fn get_connected_gamepads() -> Result<Vec<ConnectedGamepad>, String> {
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
        EnumWindows(
            Some(enum_windows_proc),
            &mut window_pids as *mut _ as LPARAM,
        );
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
pub fn get_active_processes(
    query: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<ActiveProcess>, String> {
    let normalized = query.unwrap_or_default().trim().to_ascii_lowercase();
    let limit = limit.unwrap_or(150).clamp(1, 500);

    let mut processes = collect_processes()?;
    if !normalized.is_empty() {
        processes.retain(|process| process.exe_name.to_ascii_lowercase().contains(&normalized));
    }

    processes.sort_by(|a, b| a.exe_name.cmp(&b.exe_name));
    let mut seen = HashSet::new();
    processes.retain(|process| seen.insert(process.exe_name.to_ascii_lowercase()));
    if processes.len() > limit {
        processes.truncate(limit);
    }

    Ok(processes)
}
