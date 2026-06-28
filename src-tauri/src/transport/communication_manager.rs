use std::sync::{Arc, Mutex};
use serialport::SerialPort;
use crate::transport::ble_bridge;

pub struct CommunicationManager {
    pub ble_connected: Arc<Mutex<bool>>,
}

impl CommunicationManager {
    pub fn new() -> Self {
        Self {
            ble_connected: Arc::new(Mutex::new(false)),
        }
    }

    pub fn set_ble_connected(&self, connected: bool) {
        let mut conn = self.ble_connected.lock().unwrap();
        *conn = connected;
    }

    pub fn is_ble_connected(&self) -> bool {
        *self.ble_connected.lock().unwrap()
    }

    pub fn send_command(&self, command: &str, serial_port: &mut Option<Box<dyn SerialPort>>) -> bool {
        let ble_is_connected = *self.ble_connected.lock().unwrap();

        if ble_is_connected {
            ble_bridge::ble_send_command(command);
            return true;
        }

        // Serial Fallback
        if let Some(port) = serial_port {
            let data = format!("{}\n", command);
            let _ = port.write_all(data.as_bytes());
            return true;
        }

        false
    }
}
