mod migrations;

use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn init(app: &AppHandle) -> Result<(), String> {
    let mut connection = open(app)?;

    migrations::apply(&mut connection)
}

pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let connection = Connection::open(database_path(app)?)
        .map_err(|error| format!("Failed to open database: {error}"))?;

    connection
        .pragma_update(None, "foreign_keys", true)
        .map_err(|error| format!("Failed to enable foreign keys: {error}"))?;

    Ok(connection)
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("data.sqlite"))
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("Failed to create app data directory: {error}"))?;

    Ok(app_data_dir)
}

#[cfg(test)]
pub(crate) mod test_support {
    use super::migrations;
    use rusqlite::Connection;

    pub(crate) fn migrated_connection() -> Connection {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        connection
            .pragma_update(None, "foreign_keys", true)
            .expect("enable foreign keys");
        migrations::apply(&mut connection).expect("apply migrations");

        connection
    }
}
