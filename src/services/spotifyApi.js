import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";

export async function getSpotifyAuthUrl() {
  return await invoke("spotify_auth_url");
}

export async function exchangeSpotifyCode(code) {
  return await invoke("spotify_exchange_code", {
    code,
  });
}

export async function refreshSpotifyToken(refreshToken) {
  return await invoke("spotify_refresh_token", {
    refreshToken,
  });
}

export async function getSpotifyProfile() {
  const accessToken = localStorage.getItem("spotify_access_token");

  try {

    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await emit("app-notification", {
      source: "debug",
      code: "FETCH",
      level: "info",
      title: "Spotify",
      message: "time " + response.headers.get("Retry-After")
    });

    if (!response.ok) {
      const body = await response.text();

      await emit("app-notification", {
        source: "debug",
        code: "PROFILE",
        level: "error",
        title: "Spotify",
        message: body
      });

      throw new Error(`Spotify API Error ${response.status}`);
    }

    return await response.json();

  } catch (e) {

    await emit("app-notification", {
      source: "debug",
      code: "FETCH_ERROR",
      level: "error",
      title: "Spotify",
      message: String(e)
    });

    throw e;
  }
}

export async function getCurrentPlaying() {
  const accessToken = localStorage.getItem("spotify_access_token");

  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Spotify API Error ${response.status}`);
  }

  return await response.json();
}

export async function playSpotify() {
  const accessToken = localStorage.getItem("spotify_access_token");

  await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function pauseSpotify() {
  const accessToken = localStorage.getItem("spotify_access_token");

  await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function nextTrack() {
  const accessToken = localStorage.getItem("spotify_access_token");

  await fetch("https://api.spotify.com/v1/me/player/next", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function previousTrack() {
  const accessToken = localStorage.getItem("spotify_access_token");

  await fetch("https://api.spotify.com/v1/me/player/previous", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function isSpotifyConnected() {
  try {
    const token = localStorage.getItem("spotify_access_token");

    if (!token) {
      return false;
    }

    await getSpotifyProfile();

    return true;
  } catch {
    return false;
  }
}
