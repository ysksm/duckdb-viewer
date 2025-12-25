use std::path::PathBuf;
use std::sync::RwLock;

/// Simple database path manager using RwLock for thread-safe access
pub struct DatabaseManager {
    path: RwLock<Option<PathBuf>>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        Self {
            path: RwLock::new(None),
        }
    }

    pub fn set_path(&self, path: Option<PathBuf>) {
        if let Ok(mut guard) = self.path.write() {
            *guard = path;
        }
    }

    pub fn get_path(&self) -> Option<PathBuf> {
        self.path.read().ok().and_then(|guard| guard.clone())
    }
}

impl Default for DatabaseManager {
    fn default() -> Self {
        Self::new()
    }
}
