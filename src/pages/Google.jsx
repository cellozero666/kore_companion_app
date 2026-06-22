import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getGoogleAuthUrl, exchangeGoogleCode } from "../services/googleApi";
import { FaGoogle } from "react-icons/fa";

export default function Google() {
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState(null);
  const [authCode, setAuthCode] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("google_access_token");

        if (!token) {
          return;
        }

        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error();
        }

        const data = await response.json();

        setProfile(data);

        setConnected(true);
      } catch {
        setConnected(false);

        setProfile(null);
      }
    }

    loadProfile();
  }, []);

  async function connectGoogle() {
    try {
      const authUrl = await getGoogleAuthUrl();
      await openUrl(authUrl);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleExchange() {
    try {
      const code = authCode.trim();
      
      const response = await exchangeGoogleCode(code);
      const data = JSON.parse(response);
      
      localStorage.setItem("google_access_token", data.access_token);
      localStorage.setItem("google_refresh_token", data.refresh_token);
      
      setConnected(true);
      window.location.reload();
    } catch (error) {
      console.error("Erro ao trocar código:", error);
    }
  }

  function disconnectGoogle() {
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_refresh_token");
    setConnected(false);
    setProfile(null);
  }

  return (
    <>
      <div className="spotify-header">
        <h1>Google</h1>

        <div className="spotify-user">
          <FaGoogle
            className={
              connected ? "spotify-icon connected" : "spotify-icon disconnected"
            }
            onClick={connected ? disconnectGoogle : connectGoogle}
          />

          {connected && profile && (
            <div className="spotify-profile">
              <img
                src={profile.picture}
                alt="Google Profile"
                className="profile-avatar"
              />

              <span className="spotify-username">{profile.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card spotify-player">
        {connected && profile ? (
          <>
            <img
              src={profile.picture}
              alt="Google Profile"
              className="album-cover-large"
            />
            <h2 className="track-title">{profile.name}</h2>
            <div className="track-artist">{profile.email}</div>
            <div className="track-album">Google Account Connected</div>
          </>
        ) : (
          <div className="nothing-playing">
            <div className="music-placeholder">G</div>
            <h2>Google Not Connected</h2>
            <div className="auth-box" style={{ marginTop: '20px' }}>
              <input 
                type="text" 
                placeholder="Cole o código aqui" 
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
              />
              <button onClick={handleExchange}>Finalizar Autenticação</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
