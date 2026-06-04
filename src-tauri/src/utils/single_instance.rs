#[cfg(target_os = "windows")]
use std::iter::once;
#[cfg(target_os = "windows")]
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
#[cfg(target_os = "windows")]
use std::thread;
#[cfg(target_os = "windows")]
use tauri::AppHandle;
#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, WAIT_OBJECT_0};
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Threading::{
    CreateEventW, CreateMutexW, OpenEventW, SetEvent, WaitForSingleObject,
};

#[cfg(target_os = "windows")]
const INSTANCE_SIGNAL_ACCESS: u32 = 0x0010_0002;
#[cfg(target_os = "windows")]
static INSTANCE_MUTEX: AtomicIsize = AtomicIsize::new(0);
#[cfg(target_os = "windows")]
static INSTANCE_SIGNAL: AtomicIsize = AtomicIsize::new(0);
#[cfg(target_os = "windows")]
static LISTENER_STARTED: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
fn mutex_name() -> Vec<u16> {
    "Local\\com.kidixdev.remapx.instance"
        .encode_utf16()
        .chain(once(0))
        .collect()
}

#[cfg(target_os = "windows")]
fn signal_name() -> Vec<u16> {
    "Local\\com.kidixdev.remapx.instance.activate"
        .encode_utf16()
        .chain(once(0))
        .collect()
}

#[cfg(target_os = "windows")]
fn signal_existing_instance() -> bool {
    let name = signal_name();
    let handle = unsafe { OpenEventW(INSTANCE_SIGNAL_ACCESS, 0, name.as_ptr()) };
    if handle.is_null() {
        return false;
    }

    let result = unsafe { SetEvent(handle) != 0 };
    unsafe {
        let _ = CloseHandle(handle);
    }
    result
}

#[cfg(target_os = "windows")]
pub fn notify_existing_instance() {
    let _ = signal_existing_instance();
}

#[cfg(not(target_os = "windows"))]
pub fn notify_existing_instance() {}

#[cfg(target_os = "windows")]
pub fn acquire() -> Result<bool, String> {
    if INSTANCE_MUTEX.load(Ordering::SeqCst) != 0 {
        return Ok(true);
    }

    let signal_name = signal_name();
    let signal = unsafe { CreateEventW(std::ptr::null(), 0, 0, signal_name.as_ptr()) };
    if signal.is_null() {
        return Err("Failed to create single-instance activation event".to_string());
    }

    let name = mutex_name();
    let handle = unsafe { CreateMutexW(std::ptr::null(), 1, name.as_ptr()) };
    if handle.is_null() {
        unsafe {
            let _ = CloseHandle(signal);
        }
        return Err("Failed to create single-instance mutex".to_string());
    }

    let already_exists = unsafe { GetLastError() } == ERROR_ALREADY_EXISTS;
    if already_exists {
        unsafe {
            let _ = CloseHandle(signal);
            let _ = CloseHandle(handle);
        }
        notify_existing_instance();
        return Ok(false);
    }

    INSTANCE_SIGNAL.store(signal as isize, Ordering::SeqCst);
    INSTANCE_MUTEX.store(handle as isize, Ordering::SeqCst);
    Ok(true)
}

#[cfg(target_os = "windows")]
pub fn start_activation_listener(app: AppHandle) {
    if LISTENER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    let signal = INSTANCE_SIGNAL.load(Ordering::SeqCst);
    if signal == 0 {
        return;
    }

    thread::spawn(move || loop {
        let wait_result = unsafe { WaitForSingleObject(signal as _, u32::MAX) };
        if wait_result != WAIT_OBJECT_0 {
            break;
        }

        let _ = crate::commands::window::reveal_main_window(&app, false);
    });
}

#[cfg(not(target_os = "windows"))]
pub fn acquire() -> Result<bool, String> {
    Ok(true)
}

#[cfg(not(target_os = "windows"))]
pub fn start_activation_listener(_app: tauri::AppHandle) {}
