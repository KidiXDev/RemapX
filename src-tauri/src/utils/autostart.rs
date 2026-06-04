#[cfg(target_os = "windows")]
use std::process::Command;

#[cfg(target_os = "windows")]
const RUN_KEY_PATH: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
#[cfg(target_os = "windows")]
const RUN_VALUE_NAME: &str = "RemapX";

#[cfg(target_os = "windows")]
fn current_exe_run_value() -> Result<String, String> {
    let path = std::env::current_exe().map_err(|e| e.to_string())?;
    Ok(format!("\"{}\"", path.display()))
}

#[cfg(target_os = "windows")]
pub fn set_windows_run_on_boot(enabled: bool) -> Result<(), String> {
    if enabled {
        let value = current_exe_run_value()?;
        let output = Command::new("reg")
            .args([
                "add",
                RUN_KEY_PATH,
                "/v",
                RUN_VALUE_NAME,
                "/t",
                "REG_SZ",
                "/d",
            ])
            .arg(value)
            .arg("/f")
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            return Ok(());
        }

        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if error.is_empty() {
            "Failed to enable start with Windows".to_string()
        } else {
            error
        });
    }

    let output = Command::new("reg")
        .args(["delete", RUN_KEY_PATH, "/v", RUN_VALUE_NAME, "/f"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).to_ascii_lowercase();
    if stderr.contains("unable to find") || stderr.contains("cannot find") {
        return Ok(());
    }

    Err(if stderr.trim().is_empty() {
        "Failed to disable start with Windows".to_string()
    } else {
        stderr.trim().to_string()
    })
}

#[cfg(not(target_os = "windows"))]
pub fn set_windows_run_on_boot(_enabled: bool) -> Result<(), String> {
    Err("Start with Windows is only supported on Windows".to_string())
}
