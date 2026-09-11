use std::path::{Component, Path};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

struct AppState {
    close_to_tray: Arc<AtomicBool>,
}

#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(tooltip.clone()));
        let _ = tray.set_title(Some(tooltip));
    }
    Ok(())
}

#[tauri::command]
fn set_tray_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_visible(visible);
    }
    Ok(())
}

#[tauri::command]
fn set_close_to_tray(state: tauri::State<AppState>, enabled: bool) -> Result<(), String> {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn save_and_open_ics(
    app: tauri::AppHandle,
    filename: String,
    content: String,
    open_in_calendar: bool,
) -> Result<String, String> {
    validate_ics_filename(&filename)?;

    let target_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().home_dir().map(|h| h.join("Downloads")))
        .or_else(|_| app.path().temp_dir())
        .map_err(|e| e.to_string())?;

    let file_path = target_dir.join(&filename);
    std::fs::write(&file_path, content.as_bytes()).map_err(|e| e.to_string())?;

    if open_in_calendar {
        let path_str = file_path.to_string_lossy().to_string();
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "", &path_str])
                .spawn();
        }
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open").arg(&path_str).spawn();
        }
        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("xdg-open")
                .arg(&path_str)
                .spawn();
        }
    }

    Ok(file_path.to_string_lossy().to_string())
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
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
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

#[cfg(test)]
mod tests {
    use super::validate_ics_filename;

    #[test]
    fn accepts_a_safe_ics_basename() {
        assert!(validate_ics_filename("meeting.ics").is_ok());
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

    let close_to_tray = Arc::new(AtomicBool::new(true));
    let close_to_tray_window = close_to_tray.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            close_to_tray: close_to_tray.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            update_tray_tooltip,
            set_tray_visible,
            set_close_to_tray,
            save_and_open_ics
        ])
        .setup(move |app| {
            // Build Tray Context Menu
            let show_i = MenuItem::with_id(app, "show", "Open RealTimeZones", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle", "Show / Hide", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit RealTimeZones", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &toggle_i, &quit_i])?;

            // Build Tray Icon (macOS Menu Bar / Windows & Linux System Tray)
            if let Some(icon) = app.default_window_icon() {
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
            }

            // Hide to tray on window close (clicking 'X' minimizes to tray only if close_to_tray is true)
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                let close_to_tray_clone = close_to_tray_window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        if close_to_tray_clone.load(Ordering::Relaxed) {
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running RealTimeZones desktop application");
}
