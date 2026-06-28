import { useEffect, useState } from "react";
import { FaCat } from "react-icons/fa";
import { listen } from "@tauri-apps/api/event";
import { startWatchers } from "./services/watcherManager";
import {
  autoConnect,
  disconnectSerial,
  getFirmwareVersion,
  getUptime,
  getWifiStatus,
  syncClock,
} from "./services/koreApi";
import { isSpotifyConnected } from "./services/spotifyApi";
import { isGoogleConnected } from "./services/googleApi";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Spotify from "./pages/Spotify";
import Google from "./pages/Google";
import Weather from "./pages/Weather";
import Settings from "./pages/Settings";
import { NotificationManager } from "./components/NotificationManager";

function App() {
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [firmware, setFirmware] = useState("--");
  const [uptime, setUptime] = useState("--");
  const [wifiConnected, setWifiConnected] = useState(false);
  const [wifiIp, setWifiIp] = useState("--");
  const [wifiSsid, setWifiSsid] = useState("--");

  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  async function loadAllData() {
    try {
      setFirmware(await getFirmwareVersion());
      setUptime(await getUptime());
      await loadWifiStatus();
      await loadSpotifyStatus();
      await loadGoogleStatus();
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }

  async function loadUptime() {
    setUptime(await getUptime());
  }

  async function loadWifiStatus() {
    try {
      const wifi = await getWifiStatus();

      setWifiConnected(wifi.connected);
      setWifiIp(wifi.ip);
      setWifiSsid(wifi.ssid);
    } catch (error) {
      // Notification handled by koreApi.js
    }
  }

  async function loadSpotifyStatus() {
    setSpotifyConnected(await isSpotifyConnected());
  }

  async function loadGoogleStatus() {
    setGoogleConnected(await isGoogleConnected());
  }

  async function connectToKore() {
    try {
      const result = await autoConnect();

      setConnected(result);

      if (result) {
        await loadAllData();
      }
    } catch (error) {
      // Notification handled by koreApi.js
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectFromKore() {
    try {
      await disconnectSerial();

      setConnected(false);

      setFirmware("--");
      setUptime("--");

      setWifiConnected(false);
      setWifiIp("--");
      setWifiSsid("--");
    } catch (error) {
      // Notification handled by koreApi.js
    }
  }

  useEffect(() => {
    const unlisten = listen("firmware-message", (event) => {
        const { command, value } = event.payload;

        switch (command) {
            case "version":
                setFirmware(value);
                break;
            case "uptime":
                setUptime(value);
                break;
            case "current_face":
                // Handle current face if needed
                break;
            case "wifi_status":
                const parts = value.split('|');
                setWifiConnected(parts[0] === "CONNECTED");
                setWifiSsid(parts[1]);
                setWifiIp(parts[2]);
                break;
        }
    });

    // Also need to handle connection/disconnection events
    const unlistenNotification = listen("app-notification", async (event) => {
      const { source, code } = event.payload;
      if (source === "ble") {
        if (code === "CONNECTED") {
          setConnected(true);
          // Small delay to ensure ESP32 is ready after connection
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Trigger data load commands (fire-and-forget)
          getFirmwareVersion();
          getUptime();
          getWifiStatus();
        } else if (code === "DISCONNECTED") {
          setConnected(false);
        }
      }
    });

    async function initialize() {
      setLoading(true);

      await new Promise((resolve) =>
        setTimeout(resolve, 50)
      );

      await connectToKore();

      // Atualiza status dos serviços mesmo sem abrir as abas
      await loadSpotifyStatus();
      await loadGoogleStatus();
    }

    initialize();

    startWatchers();

    return () => {
      unlisten.then((fn) => fn());
      unlistenNotification.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    syncClock();

    const clockTimer = setInterval(() => {
        const now = new Date();

        if (
            now.getMinutes() === 0 &&
            now.getSeconds() === 0
        ) {
            syncClock();
        }
    }, 1000);

    return () => {
      clearInterval(clockTimer);
    };
  }, [connected]);

  function renderPage() {
    switch (page) {
      case "spotify":
        return <Spotify />;

      case "google":
        return <Google />;

      case "weather":
        return <Weather />;

      case "settings":
        return <Settings />;

      default:
        return (
          <Dashboard
            connected={connected}
            firmware={firmware}
            uptime={uptime}
            wifiConnected={wifiConnected}
            wifiIp={wifiIp}
            wifiSsid={wifiSsid}
            spotifyConnected={spotifyConnected}
            googleConnected={googleConnected}
            connectToKore={connectToKore}
            disconnectFromKore={disconnectFromKore}
          />
        );
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <h1>K.O.R.E.</h1>
        <FaCat className="loading-cat" />
        <p>Connecting to device...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <NotificationManager />
      <Sidebar
        page={page}
        setPage={setPage}
      />

      <main className="content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;