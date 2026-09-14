use std::io::ErrorKind;
use std::path::{Component, Path};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

struct AppState {
    close_to_tray: Arc<AtomicBool>,
    tray_visible: Arc<AtomicBool>,
    tray_operation_lock: Arc<Mutex<()>>,
    start_hidden: bool,
}

#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "System tray is not available".to_string())?;
    tray.set_tooltip(Some(tooltip.clone()))
        .map_err(|error| format!("Could not update tray tooltip: {error}"))?;
    tray.set_title(Some(tooltip))
        .map_err(|error| format!("Could not update tray title: {error}"))?;
    Ok(())
}

#[tauri::command]
fn set_tray_visible(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    visible: bool,
) -> Result<(), String> {
    // Visibility changes never enable close-to-tray. A later successful visible
    // state check must explicitly restore it, so every failure remains recoverable.
    let _lock = match state.tray_operation_lock.lock() {
        Ok(lock) => lock,
        Err(_) => {
            state.close_to_tray.store(false, Ordering::Relaxed);
            state.tray_visible.store(false, Ordering::Relaxed);
            return Err("System tray state lock is unavailable".to_string());
        }
    };
    state.close_to_tray.store(false, Ordering::Relaxed);
    let tray = match app.tray_by_id("main-tray") {
        Some(tray) => tray,
        None => {
            state.tray_visible.store(false, Ordering::Relaxed);
            return Err("System tray is not available".to_string());
        }
    };
    if !visible {
        let window = app.get_webview_window("main").ok_or_else(|| {
            "Main window is not available; system tray remains visible".to_string()
        })?;
        window
            .show()
            .map_err(|error| format!("Could not restore the main window: {error}"))?;
        window
            .unminimize()
            .map_err(|error| format!("Could not restore the main window: {error}"))?;
    }
    if let Err(error) = tray.set_visible(visible) {
        if visible {
            state.tray_visible.store(false, Ordering::Relaxed);
        }
        return Err(format!("Could not update tray visibility: {error}"));
    }
    state.tray_visible.store(visible, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn set_close_to_tray(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    enabled: bool,
) -> Result<(), String> {
    if !enabled {
        state.close_to_tray.store(false, Ordering::Relaxed);
    }
    let _lock = match state.tray_operation_lock.lock() {
        Ok(lock) => lock,
        Err(_) => {
            state.close_to_tray.store(false, Ordering::Relaxed);
            return Err("System tray state lock is unavailable".to_string());
        }
    };
    if enabled {
        let tray_available = app.tray_by_id("main-tray").is_some();
        let tray_visible = state.tray_visible.load(Ordering::Relaxed);
        if !should_enable_close_to_tray(enabled, tray_available, tray_visible) {
            state.close_to_tray.store(false, Ordering::Relaxed);
            return Err("Close-to-tray requires a visible system tray".to_string());
        }
    }
    state.close_to_tray.store(enabled, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn get_start_hidden(state: tauri::State<AppState>) -> bool {
    state.start_hidden
}

#[tauri::command]
fn save_and_open_ics(
    app: tauri::AppHandle,
    filename: String,
    content: String,
    open_in_calendar: bool,
) -> Result<String, String> {
    validate_ics_filename(&filename)?;
    validate_ics_content(&content)?;

    let target_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().home_dir().map(|h| h.join("Downloads")))
        .or_else(|_| app.path().temp_dir())
        .map_err(|e| e.to_string())?;

    let file_path = target_dir.join(&filename);
    match std::fs::symlink_metadata(&file_path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            return Err("Calendar export refuses to overwrite a symlink".to_string());
        }
        Ok(_) => {}
        Err(error) if error.kind() == ErrorKind::NotFound => {}
        Err(error) => return Err(format!("Could not inspect calendar export target: {error}")),
    }
    std::fs::write(&file_path, content.as_bytes()).map_err(|e| e.to_string())?;

    if open_in_calendar {
        let path_str = file_path.to_string_lossy().to_string();
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer.exe")
                .arg(&path_str)
                .spawn()
                .map_err(|error| format!("Could not open calendar file: {error}"))?;
        }
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&path_str)
                .spawn()
                .map_err(|error| format!("Could not open calendar file: {error}"))?;
        }
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&path_str)
                .spawn()
                .map_err(|error| format!("Could not open calendar file: {error}"))?;
        }
    }

    Ok(file_path.to_string_lossy().to_string())
}

const MAX_ICS_CONTENT_BYTES: usize = 256 * 1024;

fn validate_ics_content(content: &str) -> Result<(), String> {
    if content.len() > MAX_ICS_CONTENT_BYTES {
        return Err("Calendar content is too large".to_string());
    }
    if content.contains('\0') {
        return Err("Calendar content contains a NUL character".to_string());
    }
    if !content.starts_with("BEGIN:VCALENDAR") || !content.ends_with("END:VCALENDAR") {
        return Err("Calendar content is not a valid iCalendar document".to_string());
    }
    Ok(())
}

fn validate_ics_filename(filename: &str) -> Result<(), String> {
    if filename.is_empty() {
        return Err("Calendar filename cannot be empty".to_string());
    }
    if filename.len() > 255 {
        return Err("Calendar filename is too long".to_string());
    }
    if filename.trim() != filename || filename.contains('\0') {
        return Err("Calendar filename contains invalid characters".to_string());
    }
    if filename.chars().any(|character| {
        character.is_control()
            || matches!(
                character,
                '/' | '\\'
                    | ':'
                    | '*'
                    | '?'
                    | '"'
                    | '<'
                    | '>'
                    | '|'
                    | '&'
                    | ';'
                    | '`'
                    | '$'
                    | '!'
                    | '^'
                    | '%'
                    | '('
                    | ')'
                    | '['
                    | ']'
                    | '{'
                    | '}'
            )
    }) {
        return Err("Calendar filename contains invalid characters".to_string());
    }

    if filename.contains("..") {
        return Err("Calendar filename must be a single safe basename".to_string());
    }

    let path = Path::new(filename);
    if !path.is_relative()
        || path.components().count() != 1
        || !matches!(path.components().next(), Some(Component::Normal(_)))
    {
        return Err("Calendar filename must be a single safe basename".to_string());
    }

    let lower = filename.to_ascii_lowercase();
    if !lower.ends_with(".ics") {
        return Err("Calendar filename must use the .ics extension".to_string());
    }
    let stem = &filename[..filename.len() - 4];
    if stem.is_empty() || stem.ends_with('.') || stem.ends_with(' ') {
        return Err("Calendar filename has an invalid basename".to_string());
    }

    let device_name = stem
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    if matches!(
        device_name.as_str(),
        "con"
            | "prn"
            | "aux"
            | "nul"
            | "com1"
            | "com2"
            | "com3"
            | "com4"
            | "com5"
            | "com6"
            | "com7"
            | "com8"
            | "com9"
            | "lpt1"
            | "lpt2"
            | "lpt3"
            | "lpt4"
            | "lpt5"
            | "lpt6"
            | "lpt7"
            | "lpt8"
            | "lpt9"
    ) {
        return Err("Calendar filename uses a reserved device name".to_string());
    }

    Ok(())
}

fn should_start_hidden<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == "--minimized")
}

fn should_hide_on_launch(start_hidden_requested: bool, tray_available: bool) -> bool {
    start_hidden_requested && tray_available
}

fn should_enable_close_to_tray(requested: bool, tray_available: bool, tray_visible: bool) -> bool {
    requested && tray_available && tray_visible
}

#[cfg(test)]
mod tests {
    use super::{
        should_enable_close_to_tray, should_hide_on_launch, should_start_hidden,
        validate_ics_content, validate_ics_filename,
    };

    #[test]
    fn accepts_a_safe_ics_basename() {
        assert!(validate_ics_filename("meeting.ics").is_ok());
    }

    #[test]
    fn accepts_a_minimal_calendar_payload() {
        assert!(validate_ics_content("BEGIN:VCALENDAR\r\nEND:VCALENDAR").is_ok());
    }

    #[test]
    fn rejects_oversized_or_malformed_calendar_payloads() {
        assert!(validate_ics_content("not a calendar").is_err());
        assert!(validate_ics_content("BEGIN:VCALENDAR\r\nbad\0value\r\nEND:VCALENDAR").is_err());
        assert!(validate_ics_content(&"x".repeat(256 * 1024 + 1)).is_err());
    }

    #[test]
    fn rejects_shell_metacharacters_and_reserved_device_names() {
        for filename in [
            "meeting&open.ics",
            "meeting|open.ics",
            "meeting;open.ics",
            "meeting`open.ics",
            "CON.ics",
        ] {
            assert!(
                validate_ics_filename(filename).is_err(),
                "unsafe filename accepted: {filename}"
            );
        }
    }

    #[test]
    fn rejects_path_traversal_and_non_ics_filenames() {
        for filename in [
            "../escape.ics",
            "..\\\\escape.ics",
            "/tmp/escape.ics",
            "C:\\\\escape.ics",
            "meeting.txt",
            "meeting.ics\\0payload",
        ] {
            assert!(
                validate_ics_filename(filename).is_err(),
                "unsafe filename accepted: {filename}"
            );
        }
    }

    #[test]
    fn starts_hidden_only_for_the_explicit_autostart_argument() {
        assert!(should_start_hidden(["realtimezones", "--minimized"]));
        assert!(!should_start_hidden(["realtimezones"]));
        assert!(!should_start_hidden(["realtimezones", "--minimized=false"]));
    }

    #[test]
    fn hides_on_launch_only_when_tray_recovery_is_available() {
        assert!(should_hide_on_launch(true, true));
        assert!(!should_hide_on_launch(true, false));
        assert!(!should_hide_on_launch(false, true));
    }

    #[test]
    fn enables_close_to_tray_only_when_tray_recovery_is_available() {
        assert!(should_enable_close_to_tray(true, true, true));
        assert!(!should_enable_close_to_tray(true, false, true));
        assert!(!should_enable_close_to_tray(true, true, false));
        assert!(!should_enable_close_to_tray(false, true, true));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // Fix for WebKitGTK 2.42+ on Linux (Bazzite, Fedora, Ubuntu 24.04, Arch Wayland/EGL)
        // Prevents: "Could not create default EGL display: EGL_BAD_PARAMETER. Aborting..."
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    let close_to_tray = Arc::new(AtomicBool::new(false));
    let close_to_tray_window = close_to_tray.clone();
    let tray_visible = Arc::new(AtomicBool::new(false));
    let tray_visible_window = tray_visible.clone();
    let tray_operation_lock = Arc::new(Mutex::new(()));
    let tray_operation_lock_window = tray_operation_lock.clone();
    let start_hidden = should_start_hidden(std::env::args());

    let builder = tauri::Builder::default();
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(
        tauri_plugin_autostart::Builder::new()
            .arg("--minimized")
            .build(),
    );

    builder
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            close_to_tray: close_to_tray.clone(),
            tray_visible: tray_visible.clone(),
            tray_operation_lock: tray_operation_lock.clone(),
            start_hidden,
        })
        .invoke_handler(tauri::generate_handler![
            update_tray_tooltip,
            set_tray_visible,
            set_close_to_tray,
            get_start_hidden,
            save_and_open_ics
        ])
        .setup(move |app| {
            // Build Tray Context Menu
            let show_i = MenuItem::with_id(app, "show", "Open RealTimeZones", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle", "Show / Hide", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit RealTimeZones", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &toggle_i, &quit_i])?;

            // Build Tray Icon (macOS Menu Bar / Windows & Linux System Tray)
            let tray_available = if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::with_id("main-tray")
                    .icon(icon.clone())
                    .tooltip("RealTimeZones — Precision Global Clock")
                    .title("RealTimeZones")
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "toggle" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
                true
            } else {
                false
            };
            tray_visible_window.store(tray_available, Ordering::Relaxed);
            // Frontend boot reconciliation enables close-to-tray only after the
            // persisted tray preference and hidden-launch safety are known.
            close_to_tray_window.store(false, Ordering::Relaxed);

            // Hide to tray on window close (clicking 'X' minimizes to tray only if close_to_tray is true)
            if let Some(window) = app.get_webview_window("main") {
                if should_hide_on_launch(start_hidden, tray_available) {
                    window.hide()?;
                }

                let window_clone = window.clone();
                let close_to_tray_clone = close_to_tray_window.clone();
                let tray_operation_lock_clone = tray_operation_lock_window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        if let Ok(_lock) = tray_operation_lock_clone.lock() {
                            if close_to_tray_clone.load(Ordering::Relaxed) {
                                api.prevent_close();
                                let _ = window_clone.hide();
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running RealTimeZones desktop application");
}
