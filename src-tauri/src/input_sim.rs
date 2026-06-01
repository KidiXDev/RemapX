#[cfg(target_os = "windows")]
use std::collections::HashSet;
#[cfg(target_os = "windows")]
use std::sync::LazyLock;
#[cfg(target_os = "windows")]
use std::sync::Mutex;

#[cfg(target_os = "windows")]
static HELD_KEYS: LazyLock<Mutex<HashSet<u16>>> = LazyLock::new(|| Mutex::new(HashSet::new()));

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_LBUTTON, VK_RBUTTON,
};

pub fn key_to_vk(key: &str) -> Option<u16> {
    match key.to_uppercase().as_str() {
        "W" => Some(0x57),
        "A" => Some(0x41),
        "S" => Some(0x53),
        "D" => Some(0x44),
        "R" => Some(0x52),
        "SPACE" => Some(0x20),
        "ENTER" => Some(0x0D),
        "MOUSELEFT" => Some(VK_LBUTTON),
        "MOUSERIGHT" => Some(VK_RBUTTON),
        _ => None,
    }
}

#[cfg(target_os = "windows")]
fn send_keyboard_input(vk: u16, key_up: bool) {
    let flags = if key_up { KEYEVENTF_KEYUP } else { 0 };
    let mut input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        SendInput(
            1,
            &mut input as *mut INPUT,
            std::mem::size_of::<INPUT>() as i32,
        );
    }
}

pub fn tap_key(vk: u16) {
    #[cfg(target_os = "windows")]
    {
        send_keyboard_input(vk, false);
        send_keyboard_input(vk, true);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = vk;
    }
}

pub fn hold_key(vk: u16) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(mut held) = HELD_KEYS.lock() {
            if held.insert(vk) {
                send_keyboard_input(vk, false);
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = vk;
    }
}

pub fn release_key(vk: u16) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(mut held) = HELD_KEYS.lock() {
            if held.remove(&vk) {
                send_keyboard_input(vk, true);
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = vk;
    }
}
