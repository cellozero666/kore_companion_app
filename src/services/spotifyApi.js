import { invoke } from "@tauri-apps/api/core";

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

  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify API Error ${response.status}`);
  }

  return await response.json();
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
