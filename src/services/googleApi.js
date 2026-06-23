import { invoke } from "@tauri-apps/api/core";

export async function getGoogleAuthUrl() {
  return await invoke("google_auth_url");
}

export async function exchangeGoogleCode(code) {
  return await invoke("google_exchange_code", { code });
}

export async function refreshGoogleToken(refreshToken) {
  return await invoke("google_refresh_token", { refreshToken,});
}

export async function isGoogleConnected() {
  try {
    let token = localStorage.getItem("google_access_token");

    if (!token) {
      const refreshToken = localStorage.getItem("google_refresh_token");

      if (!refreshToken) {
        return false;
      }

      const refreshResult = await refreshGoogleToken(refreshToken);

      const refreshData = JSON.parse(refreshResult);

      token = refreshData.access_token;

      localStorage.setItem("google_access_token", token);
    }

    let response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      return true;
    }

    const refreshToken = localStorage.getItem("google_refresh_token");

    if (!refreshToken) {
      return false;
    }

    const refreshResult = await refreshGoogleToken(refreshToken);

    const refreshData = JSON.parse(refreshResult);

    localStorage.setItem("google_access_token", refreshData.access_token);

    response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${refreshData.access_token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
