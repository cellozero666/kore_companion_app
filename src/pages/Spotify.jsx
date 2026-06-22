import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  getSpotifyAuthUrl,
  exchangeSpotifyCode,
  refreshSpotifyToken,
  getSpotifyProfile,
  getCurrentPlaying,
  playSpotify,
  pauseSpotify,
  nextTrack,
  previousTrack,
} from "../services/spotifyApi";
import { FaSpotify } from "react-icons/fa";
import { listen } from "@tauri-apps/api/event";
import { sendSerialCommand } from "../services/koreApi";

export default function Spotify() {
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadCurrentTrack() {
    try {
      const data = await getCurrentPlaying();

      setCurrentTrack(data);

      if (data) {
        await sendSpotifyToDevice(data);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Erro: " + error.message);
    }
  }

  async function sendSpotifyToDevice(trackData) {
    if (!trackData || !trackData.item || !trackData.is_playing) {
      await sendSerialCommand("spotify_stop");
      return;
    }
    
    const command = [
      "spotify",
      sanitize(trackData.item.name),
      sanitize(trackData.item.artists.map((artist) => artist.name).join(", ")),
      sanitize(trackData.item.album.name),
      trackData.progress_ms,
      trackData.item.duration_ms,
      trackData.is_playing ? "1" : "0",
    ].join("|");
    
    await sendSerialCommand(command);
  }

  function sanitize(text) {
    return String(text ?? "").replaceAll("|", " ").replaceAll("\n", " ");
  }

  async function togglePlayback() {
    if (!currentTrack) {
      return;
    }

    if (currentTrack.is_playing) {
      await pauseSpotify();
    } else {
      await playSpotify();
    }

    setTimeout(loadCurrentTrack, 500);
  }

  async function nextSong() {
    await nextTrack();

    setTimeout(loadCurrentTrack, 500);
  }

  async function previousSong() {
    await previousTrack();

    setTimeout(loadCurrentTrack, 500);
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("spotify_access_token");

        if (!token) {
          return;
        }

        const profileData = await getSpotifyProfile();

        setProfile(profileData);

        setConnected(true);

        await loadCurrentTrack();
      } catch (error) {
        console.error(error);

        try {
          const refreshToken = localStorage.getItem("spotify_refresh_token");

          if (!refreshToken) {
            throw new Error("No refresh token");
          }

          const refreshResult = await refreshSpotifyToken(refreshToken);

          const refreshData = JSON.parse(refreshResult);

          localStorage.setItem(
            "spotify_access_token",
            refreshData.access_token
          );

          const profileData = await getSpotifyProfile();

          setProfile(profileData);

          setConnected(true);

          await loadCurrentTrack();
        } catch (refreshError) {
          console.error(refreshError);

          localStorage.removeItem("spotify_access_token");

          localStorage.removeItem("spotify_refresh_token");

          setConnected(false);
        }
      }
    }

    loadProfile();

    let unlisten;

    listen("spotify-callback", async (event) => {
      try {
        const url = String(event.payload);

        const parsedUrl = new URL(url);

        const code = parsedUrl.searchParams.get("code");

        if (!code) {
          return;
        }

        const result = await exchangeSpotifyCode(code);

        const tokenData = JSON.parse(result);

        localStorage.setItem("spotify_access_token", tokenData.access_token);

        localStorage.setItem("spotify_refresh_token", tokenData.refresh_token);

        const profileData = await getSpotifyProfile();

        setProfile(profileData);

        setConnected(true);

        await loadCurrentTrack();
      } catch (error) {}
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    loadCurrentTrack();

    const interval = setInterval(loadCurrentTrack, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [connected]);

  async function connectSpotify() {
    try {
      const authUrl = await getSpotifyAuthUrl();

      await openUrl(authUrl);
    } catch (error) {
      console.error(error);
    }
  }

  function disconnectSpotify() {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_refresh_token");
    setConnected(false);
    setProfile(null);

    setCurrentTrack(null);
  }

  return (
    <>
      <div className="spotify-header">
        <h1>Spotify</h1>

        <div className="spotify-user">
          <FaSpotify
            className={
              connected ? "spotify-icon connected" : "spotify-icon disconnected"
            }
            onClick={connected ? disconnectSpotify : connectSpotify}
          />

          {connected && profile && (
            <div className="spotify-profile">
              <img
                src={profile.images?.[0]?.url}
                alt="Spotify Profile"
                className="profile-avatar"
              />

              <span className="spotify-username">{profile.display_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card spotify-player">
        {errorMessage && <p style={{color: 'red', fontSize: '12px'}}>{errorMessage}</p>}
        {currentTrack && currentTrack.item ? (
          <>
            <img
              src={currentTrack.item.album.images?.[0]?.url}
              alt="Album Cover"
              className="album-cover-large"
            />

            <h2 className="track-title">{currentTrack.item.name}</h2>

            <div className="track-artist">
              {currentTrack.item.artists
                .map((artist) => artist.name)
                .join(", ")}
            </div>

            <div className="track-album">{currentTrack.item.album.name}</div>

            <div className="track-progress">
              <progress
                value={currentTrack.progress_ms}
                max={currentTrack.item.duration_ms}
                className="progress-bar"
              />
            </div>
          </>
        ) : (
          <div className="nothing-playing">
            <div className="music-placeholder">♫</div>

            <h2>Nothing Playing</h2>
          </div>
        )}
      </div>
    </>
  );
}
