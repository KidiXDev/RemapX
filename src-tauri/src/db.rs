use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mapping {
    pub button_id: i64,
    pub key_str: String,
    pub mapping_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub debounce_ms: i64,
    pub axis_deadzone: f64,
    pub target_exe: String,
    pub mappings: Vec<Mapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsPayload {
    pub values: HashMap<String, String>,
}

fn db_path() -> Result<PathBuf, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let parent = exe_path
        .parent()
        .ok_or_else(|| "Cannot resolve executable parent directory".to_string())?;
    Ok(parent.join("config.db"))
}

fn open_connection() -> Result<Connection, String> {
    let path = db_path()?;
    Connection::open(path).map_err(|e| e.to_string())
}

pub fn init_db() -> Result<(), String> {
    let conn = open_connection()?;
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profiles (
          name TEXT PRIMARY KEY,
          debounce_ms INTEGER NOT NULL,
          axis_deadzone REAL NOT NULL,
          target_exe TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS mappings (
          profile_name TEXT NOT NULL,
          button_id INTEGER NOT NULL,
          key_str TEXT NOT NULL,
          mapping_type TEXT NOT NULL DEFAULT 'Keyboard',
          PRIMARY KEY (profile_name, button_id),
          FOREIGN KEY (profile_name) REFERENCES profiles(name) ON DELETE CASCADE
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    seed_if_needed(&conn)?;
    Ok(())
}

fn seed_if_needed(conn: &Connection) -> Result<(), String> {
    let profile_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM profiles", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if profile_count == 0 {
        conn.execute(
            "INSERT INTO profiles(name, debounce_ms, axis_deadzone, target_exe) VALUES (?1, ?2, ?3, ?4)",
            params!["Default", 10_i64, 0.12_f64, ""],
        )
        .map_err(|e| e.to_string())?;

        let defaults = [
            (0_i64, "SPACE", "Keyboard"),
            (1_i64, "R", "Keyboard"),
            (2_i64, "MOUSELEFT", "Mouse"),
            (3_i64, "MOUSERIGHT", "Mouse"),
        ];

        for (button_id, key_str, mapping_type) in defaults {
            conn.execute(
                "INSERT INTO mappings(profile_name, button_id, key_str, mapping_type) VALUES (?1, ?2, ?3, ?4)",
                params!["Default", button_id, key_str, mapping_type],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let settings = [
        ("theme", "dark"),
        ("runOnBoot", "false"),
        ("startMinimized", "false"),
        ("minimizeToTray", "true"),
        ("activeProfile", "Default"),
    ];

    for (k, v) in settings {
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES (?1, ?2)",
            params![k, v],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn get_settings() -> Result<SettingsPayload, String> {
    let conn = open_connection()?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut values = HashMap::new();

    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let key: String = row.get(0).map_err(|e| e.to_string())?;
        let value: String = row.get(1).map_err(|e| e.to_string())?;
        values.insert(key, value);
    }

    Ok(SettingsPayload { values })
}

pub fn save_setting(key: &str, value: &str) -> Result<(), String> {
    let conn = open_connection()?;
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn get_profile_mappings(conn: &Connection, name: &str) -> Result<Vec<Mapping>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT button_id, key_str, mapping_type FROM mappings WHERE profile_name=?1 ORDER BY button_id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![name], |row| {
            Ok(Mapping {
                button_id: row.get(0)?,
                key_str: row.get(1)?,
                mapping_type: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn get_profiles() -> Result<Vec<Profile>, String> {
    let conn = open_connection()?;
    let mut stmt = conn
        .prepare(
            "SELECT name, debounce_ms, axis_deadzone, target_exe FROM profiles ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut profiles = Vec::new();
    for row in rows {
        let (name, debounce_ms, axis_deadzone, target_exe) = row.map_err(|e| e.to_string())?;
        let mappings = get_profile_mappings(&conn, &name)?;
        profiles.push(Profile {
            name,
            debounce_ms,
            axis_deadzone,
            target_exe,
            mappings,
        });
    }

    Ok(profiles)
}

pub fn save_profile(profile: &Profile) -> Result<(), String> {
    let mut conn = open_connection()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO profiles(name, debounce_ms, axis_deadzone, target_exe) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(name) DO UPDATE SET debounce_ms=excluded.debounce_ms, axis_deadzone=excluded.axis_deadzone, target_exe=excluded.target_exe",
        params![
            profile.name,
            profile.debounce_ms,
            profile.axis_deadzone,
            profile.target_exe
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM mappings WHERE profile_name=?1",
        params![profile.name],
    )
    .map_err(|e| e.to_string())?;

    for m in &profile.mappings {
        tx.execute(
            "INSERT INTO mappings(profile_name, button_id, key_str, mapping_type) VALUES (?1, ?2, ?3, ?4)",
            params![profile.name, m.button_id, m.key_str, m.mapping_type],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_profile(name: &str) -> Result<(), String> {
    let conn = open_connection()?;
    conn.execute("DELETE FROM profiles WHERE name=?1", params![name])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_profile(name: &str) -> Result<Profile, String> {
    if name.trim().is_empty() {
        return Err("Profile name cannot be empty".to_string());
    }

    let exists = get_profiles()?
        .into_iter()
        .any(|profile| profile.name.eq_ignore_ascii_case(name));
    if exists {
        return Err(format!("Profile '{}' already exists", name));
    }

    let profile = Profile {
        name: name.trim().to_string(),
        debounce_ms: 10,
        axis_deadzone: 0.12,
        target_exe: String::new(),
        mappings: vec![],
    };
    save_profile(&profile)?;
    Ok(profile)
}

pub fn rename_profile(old_name: &str, new_name: &str) -> Result<Profile, String> {
    if new_name.trim().is_empty() {
        return Err("New profile name cannot be empty".to_string());
    }

    let mut profiles = get_profiles()?;
    let source = profiles
        .iter_mut()
        .find(|profile| profile.name == old_name)
        .ok_or_else(|| format!("Profile '{}' not found", old_name))?
        .clone();

    if source.name.eq_ignore_ascii_case(new_name) {
        return Ok(source);
    }

    let exists = get_profiles()?
        .into_iter()
        .any(|profile| profile.name.eq_ignore_ascii_case(new_name));
    if exists {
        return Err(format!("Profile '{}' already exists", new_name));
    }

    let mut renamed = source;
    renamed.name = new_name.trim().to_string();
    save_profile(&renamed)?;
    delete_profile(old_name)?;
    Ok(renamed)
}

pub fn duplicate_profile(name: &str, new_name: &str) -> Result<Profile, String> {
    let mut profiles = get_profiles()?;
    let source = profiles
        .iter_mut()
        .find(|p| p.name == name)
        .ok_or_else(|| format!("Profile '{}' not found", name))?
        .clone();

    let mut copy = source;
    copy.name = new_name.to_string();
    save_profile(&copy)?;
    Ok(copy)
}
