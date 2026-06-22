import { invoke } from "@tauri-apps/api/core";

export async function listPorts() {
  try {
    return await invoke("list_ports");
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);

    throw error;
  }
}

export async function connectSerial(portName) {
  try {
    return await invoke("connect_serial", {
      portName,
    });
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);
    throw error;
  }
}

export async function disconnectSerial() {
  try {
    return await invoke("disconnect_serial");
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);
    throw error;
  }
}


export async function autoConnect() {
  try {
    return await invoke("auto_connect");
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);
    throw error;
  }
}

export async function getFirmwareVersion() {
  try {
    return await invoke("get_firmware_version");
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);

    throw error;
  }
}

export async function getCurrentFace() {
  try {
    return await invoke("get_current_face");
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);

    throw error;
  }
}

export async function getUptime() {
  try {
    return await invoke("get_uptime");
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);

    throw error;
  }
}

export async function sendSerialCommand(command) {
  try {
    return await invoke("send_serial_command", {
      command,
    });
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);

    throw error;
  }
}

export async function getWifiStatus() {
  try {
    const response = await invoke("get_wifi_status");
    const parts = response.split("|");
    return {
      connected: parts[0] === "CONNECTED",
      ssid: parts[1] ?? "--",
      ip: parts[2] ?? "--",
    };
  } catch (error) {
    console.error("K.O.R.E. API Error:", error);
    throw error;
  }
}

