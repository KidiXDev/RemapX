#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::GetLastError;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT,
    KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, MAPVK_VK_TO_VSC_EX,
    MOUSEEVENTF_MOVE, MOUSEINPUT,
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
fn is_extended_vk(vk: u16) -> bool {
    matches!(
        vk,
        VK_LEFT
            | VK_RIGHT
            | VK_UP
            | VK_DOWN
            | VK_INSERT
            | VK_DELETE
            | VK_HOME
            | VK_END
            | VK_PRIOR
            | VK_NEXT
            | VK_RETURN
            | VK_MENU
            | VK_CONTROL
    )
}

#[cfg(target_os = "windows")]
fn send_keyboard_input(vk: u16, key_up: bool) -> Result<(), u32> {
    let scan = unsafe { MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC_EX) } as u16;
    if scan == 0 {
        return Err(0);
    }

    let mut flags = KEYEVENTF_SCANCODE;
    if key_up {
        flags |= KEYEVENTF_KEYUP;
    }
    if is_extended_vk(vk) {
        flags |= KEYEVENTF_EXTENDEDKEY;
    }

    let mut input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                // Use hardware scan codes for wider compatibility across apps/games.
                wVk: 0,
                wScan: scan,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    let sent = unsafe {
        SendInput(
            1,
            &mut input as *mut INPUT,
            std::mem::size_of::<INPUT>() as i32,
        )
    };

    if sent == 1 {
        Ok(())
    } else {
        Err(unsafe { GetLastError() })
    }
}

pub fn tap_key(vk: u16) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        key_down(vk)?;
        key_up(vk)?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = vk;
        Ok(())
    }
}

pub fn key_down(vk: u16) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        send_keyboard_input(vk, false)
            .map_err(|code| format!("key down SendInput failed (vk={vk}, err={code})"))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = vk;
        Ok(())
    }
}

pub fn key_up(vk: u16) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        send_keyboard_input(vk, true)
            .map_err(|code| format!("key up SendInput failed (vk={vk}, err={code})"))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = vk;
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn send_mouse_move_input(dx: i32, dy: i32) -> Result<(), u32> {
    let mut input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx,
                dy,
                mouseData: 0,
                dwFlags: MOUSEEVENTF_MOVE,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    let sent = unsafe {
        SendInput(
            1,
            &mut input as *mut INPUT,
            std::mem::size_of::<INPUT>() as i32,
        )
    };

    if sent == 1 {
        Ok(())
    } else {
        Err(unsafe { GetLastError() })
    }
}

pub fn move_mouse(dx: i32, dy: i32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if dx == 0 && dy == 0 {
            return Ok(());
        }

        send_mouse_move_input(dx, dy)
            .map_err(|code| format!("mouse move SendInput failed (dx={dx}, dy={dy}, err={code})"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (dx, dy);
        Ok(())
    }
}
