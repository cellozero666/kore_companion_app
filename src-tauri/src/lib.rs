use std::io::Read;
use std::io::Write;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Emitter;
use tauri::AppHandle;
use tauri_plugin_deep_link::DeepLinkExt;
use serialport::SerialPort;
use std::ffi::CStr;
use std::os::raw::c_char;
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool,Ordering};
mod config;
use crate::config::{
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
};

static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();
static WATCHER_STARTED: AtomicBool = AtomicBool::new(false);
struct AppState
{
    serial_port: Mutex<
        Option<Box<dyn SerialPort>>
    >,
}

use tiny_http::{Server, Response};
use std::thread;

#[tauri::command]
fn start_oauth_server(app_handle: AppHandle) {
    thread::spawn(move || {
        let server = Server::http("127.0.0.1:12345").unwrap();
        if let Some(request) = server.recv().ok() {
            let url = request.url().to_string();
            let response = Response::from_string("Autenticação concluída! Pode fechar esta janela.");
            let _ = request.respond(response);

            if url.contains("code=") {
                let _ = app_handle.emit("google-callback", url);
            }
        }
    });
}

#[tauri::command]
fn list_ports() -> Vec<String>
{
    let mut ports_list = Vec::new();
    match serialport::available_ports()
    {
        Ok(ports) =>
        {
            for port in ports
            {
                ports_list.push(
                    port.port_name
                );
            }
        }

        Err(error) =>
        {
            eprintln!(
                "Error listing ports: {}",
                error
            );
        }
    }

    ports_list
}

#[tauri::command]
fn connect_serial(
    port_name: String,
    state: tauri::State<AppState>
) -> bool
{
    match serialport::new(
        port_name,
        115200
    )
    .timeout(
        Duration::from_millis(
            1000
        )
    )
    .open()
    {
        Ok(port) =>
        {
            let mut serial_port =
                state
                    .serial_port
                    .lock()
                    .unwrap();

            *serial_port =
                Some(port);

            true
        }

        Err(error) =>
        {
            eprintln!(
                "Connection error: {}",
                error
            );

            false
        }
    }
}

#[tauri::command]
fn disconnect_serial(
    state: tauri::State<AppState>
) -> bool
{
    let mut serial_port =
        state
            .serial_port
            .lock()
            .unwrap();

    *serial_port =
        None;

    true
}

#[tauri::command]
fn spotify_auth_url() -> String
{
    let scope = "user-read-private user-read-email user-read-playback-state user-modify-playback-state user-read-currently-playing";
    format!(
        "https://accounts.spotify.com/authorize\
        ?client_id={}\
        &response_type=code\
        &redirect_uri={}\
        &scope={}",
        SPOTIFY_CLIENT_ID,
        urlencoding::encode(
            SPOTIFY_REDIRECT_URI
        ),
        urlencoding::encode(
            scope
        )
    )
}
#[tauri::command]
async fn spotify_exchange_code(code: String) -> Result<String, String>
{
    let client = reqwest::Client::new();
    let response = client
        .post(
            "https://accounts.spotify.com/api/token"
        )
        .form(
            &[
                (
                    "grant_type",
                    "authorization_code"
                ),
                (
                    "code",
                    &code
                ),
                (
                    "redirect_uri",
                    SPOTIFY_REDIRECT_URI
                ),
                (
                    "client_id",
                    SPOTIFY_CLIENT_ID
                ),
                (
                    "client_secret",
                    SPOTIFY_CLIENT_SECRET
                )
            ]
        )
        .send()
        .await
        .map_err(|e|
            {
                e.to_string()
            }
        )?;

    let body = response
        .text()
        .await
        .map_err(|e|
            {
                e.to_string()
            }
        )?;

    Ok(
        body
    )
}
#[tauri::command]
async fn spotify_refresh_token(
    refresh_token: String
) -> Result<String, String>
{
    let client = reqwest::Client::new();

    let response = client
        .post(
            "https://accounts.spotify.com/api/token"
        )
        .form(
            &[
                (
                    "grant_type",
                    "refresh_token"
                ),
                (
                    "refresh_token",
                    &refresh_token
                ),
                (
                    "client_id",
                    SPOTIFY_CLIENT_ID
                ),
                (
                    "client_secret",
                    SPOTIFY_CLIENT_SECRET
                )
            ]
        )
        .send()
        .await
        .map_err(
            |e| e.to_string()
        )?;

    let body = response
        .text()
        .await
        .map_err(
            |e| e.to_string()
        )?;

    Ok(
        body
    )
}
#[tauri::command]
async fn google_refresh_token(
    refresh_token: String
) -> Result<String, String>
{
    let client = reqwest::Client::new();

    let response = client
        .post(
            "https://oauth2.googleapis.com/token"
        )
        .form(
            &[
                (
                    "grant_type",
                    "refresh_token"
                ),
                (
                    "refresh_token",
                    &refresh_token
                ),
                (
                    "client_id",
                    GOOGLE_CLIENT_ID
                ),
                (
                    "client_secret",
                    GOOGLE_CLIENT_SECRET
                )
            ]
        )
        .send()
        .await
        .map_err(
            |e| e.to_string()
        )?;

    let body = response
        .text()
        .await
        .map_err(
            |e| e.to_string()
        )?;

    Ok(
        body
    )
}
#[tauri::command]
fn google_auth_url() -> String
{
    let scope =
        "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly";

    format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
        ?client_id={}\
        &redirect_uri={}\
        &response_type=code\
        &scope={}\
        &access_type=offline\
        &prompt=consent",
        GOOGLE_CLIENT_ID,
        urlencoding::encode(
            GOOGLE_REDIRECT_URI
        ),
        urlencoding::encode(
            scope
        )
    )
}
#[tauri::command]
async fn google_exchange_code(
    code: String
) -> Result<String, String>
{
    let client =
        reqwest::Client::new();

    let response =
        client
            .post(
                "https://oauth2.googleapis.com/token"
            )
            .form(
                &[
                    (
                        "grant_type",
                        "authorization_code"
                    ),
                    (
                        "code",
                        &code
                    ),
                    (
                        "redirect_uri",
                        GOOGLE_REDIRECT_URI
                    ),
                    (
                        "client_id",
                        GOOGLE_CLIENT_ID
                    ),
                    (
                        "client_secret",
                        GOOGLE_CLIENT_SECRET
                    )
                ]
            )
            .send()
            .await
            .map_err(
                |e|
                    e.to_string()
            )?;

    let body =
        response
            .text()
            .await
            .map_err(
                |e|
                    e.to_string()
            )?;

    Ok(body)
}
#[tauri::command]
fn auto_connect(
    state: tauri::State<AppState>
) -> bool
{
    println!(
        "Searching for K.O.R.E..."
    );

    let ports =
        match serialport::available_ports()
        {
            Ok(ports) => ports,
            Err(_) => return false
        };

    for port_info in ports
    {
        println!(
            "Trying {}",
            port_info.port_name
        );

        let mut port =
            match serialport::new(
                &port_info.port_name,
                115200
            )
            .timeout(
                Duration::from_millis(
                    1000
                )
            )
            .open()
            {
                Ok(port) => port,
                Err(_) => continue
            };

        let _ =
            port.write_all(
                b"ping\n"
            );

        std::thread::sleep(
            Duration::from_millis(
                300
            )
        );

        let mut buffer =
            [0u8; 256];

        match port.read(
            &mut buffer
        )
        {
            Ok(size) =>
            {
                let response =
                    String::from_utf8_lossy(
                        &buffer[..size]
                    );

                println!(
                    "RX: {}",
                    response
                );

                if response.contains(
                    "KORE_COMPANION"
                )
                {
                    println!(
                        "K.O.R.E. found!"
                    );

                    let mut serial_port =
                        state
                            .serial_port
                            .lock()
                            .unwrap();

                    *serial_port =
                        Some(port);

                    return true;
                }
            }

            Err(_) =>
            {
                continue;
            }
        }
    }

    println!(
        "K.O.R.E. not found"
    );

    false
}

#[tauri::command]
fn get_firmware_version(
    state: tauri::State<AppState>
) -> String
{
    let mut serial_port =
        state
            .serial_port
            .lock()
            .unwrap();

    match serial_port.as_mut()
    {
        Some(port) =>
        {
            let _ =
                port.write_all(
                    b"version\n"
                );

            std::thread::sleep(
                Duration::from_millis(
                    200
                )
            );

            let mut buffer =
                [0u8; 256];

            match port.read(
                &mut buffer
            )
            {
                Ok(size) =>
                {
                    String::from_utf8_lossy(
                        &buffer[..size]
                    )
                    .trim()
                    .to_string()
                }

                Err(_) =>
                {
                    "Unknown"
                        .to_string()
                }
            }
        }

        None =>
        {
            "Disconnected"
                .to_string()
        }
    }
}

#[tauri::command]
fn get_wifi_status(
    state: tauri::State<AppState>
) -> String {
    let mut serial_port =
        state
        .serial_port
        .lock()
        .unwrap();

    match serial_port.as_mut() {
        Some(port) => {
            let _ =
                port.write_all(
                    b"wifi_status\n"
                );

            std::thread::sleep(
                Duration::from_millis(
                    200
                )
            );

            let mut buffer =
                [0u8; 256];

            match port.read(
                &mut buffer
            ) {
                Ok(size) => {
                    String::from_utf8_lossy(
                        &buffer[..size]
                    )
                    .trim()
                    .to_string()
                }

                Err(_) => {
                    "DISCONNECTED|--|--"
                        .to_string()
                }
            }
        }

        None => {
            "DISCONNECTED|--|--"
                .to_string()
        }
    }
}

#[tauri::command]
fn get_current_face(
    state: tauri::State<AppState>
) -> String
{
    let mut serial_port =
        state
            .serial_port
            .lock()
            .unwrap();

    match serial_port.as_mut()
    {
        Some(port) =>
        {
            let _ =
                port.write_all(
                    b"current_face\n"
                );

            std::thread::sleep(
                Duration::from_millis(
                    200
                )
            );

            let mut buffer =
                [0u8; 256];

            match port.read(
                &mut buffer
            )
            {
                Ok(size) =>
                {
                    String::from_utf8_lossy(
                        &buffer[..size]
                    )
                    .trim()
                    .to_string()
                }

                Err(_) =>
                {
                    "Unknown"
                        .to_string()
                }
            }
        }

        None =>
        {
            "Disconnected"
                .to_string()
        }
    }
}

#[tauri::command]
fn get_uptime(
    state: tauri::State<AppState>
) -> String
{
    let mut serial_port =
        state
            .serial_port
            .lock()
            .unwrap();

    match serial_port.as_mut()
    {
        Some(port) =>
        {
            let _ =
                port.write_all(
                    b"uptime\n"
                );

            std::thread::sleep(
                Duration::from_millis(
                    200
                )
            );

            let mut buffer =
                [0u8; 256];

            match port.read(
                &mut buffer
            )
            {
                Ok(size) =>
                {
                    String::from_utf8_lossy(
                        &buffer[..size]
                    )
                    .trim()
                    .to_string()
                }

                Err(_) =>
                {
                    "Unknown"
                        .to_string()
                }
            }
        }

        None =>
        {
            "Disconnected"
                .to_string()
        }
    }
}

#[tauri::command]
fn send_serial_command(
    command: String,
    state: tauri::State<AppState>
) -> bool
{
    let mut serial_port =
        state
            .serial_port
            .lock()
            .unwrap();

    match serial_port.as_mut()
    {
        Some(port) =>
        {
            let data =
                format!(
                    "{}\n",
                    command
                );

            match port.write_all(
                data.as_bytes()
            )
            {
                Ok(_) =>
                {
                    println!(
                        "TX: {}",
                        command
                    );

                    true
                }

                Err(error) =>
                {
                    println!(
                        "Write error: {}",
                        error
                    );

                    false
                }
            }
        }

        None =>
        {
            println!(
                "No serial connection"
            );

            false
        }
    }
}

#[tauri::command]
fn check_accessibility_permission() -> bool
{
    #[cfg(target_os = "macos")]
    {
        accessibility::application_is_trusted_with_prompt();
        accessibility::application_is_trusted()
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}
#[tauri::command]
fn check_notification_center() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        is_notification_center_running()
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[tauri::command]

fn start_notification_watcher() {
    #[cfg(target_os = "macos")]
    {
        if WATCHER_STARTED.swap(true, Ordering::SeqCst) 
        {
            return;
        }
        unsafe {
            start_notification_watcher_native();
        }
    }
}

#[cfg(target_os = "macos")]
use macos_accessibility_client::accessibility;

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn is_notification_center_running() -> bool;
    fn start_notification_watcher_native();
}

#[unsafe(no_mangle)]
pub extern "C" fn emit_notification(
    app: *const c_char,
    title: *const c_char,
    body: *const c_char,
) {
    let app = unsafe {
        CStr::from_ptr(app)
            .to_string_lossy()
            .into_owned()
    };

    let title = unsafe {
        CStr::from_ptr(title)
            .to_string_lossy()
            .into_owned()
    };

    let body = unsafe {
        CStr::from_ptr(body)
            .to_string_lossy()
            .into_owned()
    };

    if let Some(handle) = APP_HANDLE.get() {

        let _ = handle.emit(
            "system-notification",
            serde_json::json!({
                "app": app,
                "title": title,
                "body": body
            })
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()
{
    tauri::Builder::default()

        .manage(
            AppState
            {
                serial_port: Mutex::new(None)
            }
        )

        .plugin(
            tauri_plugin_opener::init()
        )

        .plugin(
            tauri_plugin_deep_link::init()
        )

        .setup(|app| {

            let _ = APP_HANDLE.set(
                app.handle().clone()
            );

            let app_handle =
                app.handle().clone();

            app.deep_link().on_open_url(
                move |event|
                {
                    for url in event.urls()
                    {
                        let _ = app_handle.emit(
                            "spotify-callback",
                            url.to_string()
                        );
                    }
                }
            );

            Ok(())
        })

        .invoke_handler(
            tauri::generate_handler![
                list_ports,
                connect_serial,
                disconnect_serial,
                spotify_auth_url,
                spotify_exchange_code,
                spotify_refresh_token,
                google_auth_url,
                google_exchange_code,
                google_refresh_token,
                auto_connect,
                get_firmware_version,
                get_wifi_status,
                get_current_face,
                get_uptime,
                check_accessibility_permission,
                check_notification_center,
                start_notification_watcher,
                send_serial_command,
                start_oauth_server
            ]
        )

        .run(
            tauri::generate_context!()
        )

        .expect(
            "error while running tauri application"
        );
}