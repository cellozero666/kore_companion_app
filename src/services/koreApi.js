import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

async function request(command, args = {}) {
  try {
    return await invoke(command, args);
  } catch (error) {
    await emit("app-notification", {
      source: "api",
      code: "API_ERROR",
      level: "error",
      title: "Erro na API",
      message: error.toString(),
      duration: 5000,
      persistent: false,
      priority: "high"
    });
    throw error;
  }
}

export async function listPorts() {
  return await request("list_ports");
}

export async function connectSerial(portName) {
  return await request("connect_serial", {
    portName,
  });
}

export async function disconnectSerial() {
  return await request("disconnect_serial");
}

export async function autoConnect() {
  return await request("auto_connect");
}

export async function getFirmwareVersion() {
  return await request("get_firmware_version");
}

export async function getCurrentFace() {
  return await request("get_current_face");
}

export async function getUptime() {
  return await request("get_uptime");
}

export async function sendSerialCommand(command) {
  return await request("send_serial_command", {
    command,
  });
}

export async function getWifiStatus() {
  const response = await request("get_wifi_status");
  const parts = response.split("|");
  return {
    connected: parts[0] === "CONNECTED",
    ssid: parts[1] ?? "--",
    ip: parts[2] ?? "--",
  };
}
