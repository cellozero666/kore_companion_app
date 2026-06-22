import { invoke } from "@tauri-apps/api/core";

export async function getGoogleAuthUrl() {
  return await invoke("google_auth_url");
}

export async function exchangeGoogleCode(code) {
  return await invoke("google_exchange_code", { code });
}
