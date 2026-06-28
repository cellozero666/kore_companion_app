use std::ffi::CString;

pub fn ble_send_command(command: &str) {
    let c_command = CString::new(command).expect("CString::new failed");
    unsafe {
        ffi::ble_send_command_native(c_command.as_ptr());
    }
}

mod ffi {
    use std::os::raw::c_char;
    extern "C" {
        pub fn ble_send_command_native(command: *const c_char);
    }
}
