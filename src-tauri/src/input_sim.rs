#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
};

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    VK_BACK, VK_CONTROL, VK_DELETE, VK_DOWN, VK_END, VK_ESCAPE, VK_HOME, VK_INSERT, VK_LEFT,
    VK_MENU, VK_NEXT, VK_PRIOR, VK_RETURN, VK_RIGHT, VK_SHIFT, VK_SPACE, VK_TAB, VK_UP,
};

fn map_named_vk(key: &str) -> Option<u16> {
    match key {
        "SPACE" => Some(VK_SPACE),
        "ENTER" => Some(VK_RETURN),
        "TAB" => Some(VK_TAB),
        "ESC" | "ESCAPE" => Some(VK_ESCAPE),
        "BACKSPACE" => Some(VK_BACK),
        "LEFT" => Some(VK_LEFT),
        "RIGHT" => Some(VK_RIGHT),
        "UP" => Some(VK_UP),
        "DOWN" => Some(VK_DOWN),
        "INSERT" => Some(VK_INSERT),
        "DELETE" => Some(VK_DELETE),
        "HOME" => Some(VK_HOME),
        "END" => Some(VK_END),
        "PAGEUP" => Some(VK_PRIOR),
        "PAGEDOWN" => Some(VK_NEXT),
        "SHIFT" => Some(VK_SHIFT),
        "CTRL" | "CONTROL" => Some(VK_CONTROL),
        "ALT" => Some(VK_MENU),
        _ => None,
    }
}

pub fn key_to_vk(key: &str) -> Option<u16> {
    let normalized = key.trim().to_ascii_uppercase();

    if normalized.len() == 1 {
        let ch = normalized.chars().next()?;
        if ch.is_ascii_alphabetic() || ch.is_ascii_digit() {
            return Some(ch as u16);
        }
    }

    if let Some(rest) = normalized.strip_prefix('F') {
        if let Ok(n) = rest.parse::<u16>() {
            if (1..=24).contains(&n) {
                return Some(0x70 + (n - 1));
            }
        }
    }

    map_named_vk(&normalized)
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
