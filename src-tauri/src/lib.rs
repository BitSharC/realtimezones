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
            let _ = std::process::Command::new("open")
                .arg(&path_str)
                .spawn();
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
