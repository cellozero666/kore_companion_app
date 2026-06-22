fn main() {
    tauri_build::build();

    #[cfg(target_os = "macos")]
    {
        println!("cargo:rerun-if-changed=native/NotificationWatcher.swift");

        swift_rs::SwiftLinker::new("11.0")
            .with_package("NotificationWatcher", "native")
            .link();
    }
}