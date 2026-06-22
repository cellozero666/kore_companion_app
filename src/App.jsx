import { useEffect, useState } from "react";
import { FaCat } from "react-icons/fa";
import { startWatchers } from "./services/watcherManager";
import {
  autoConnect,
  disconnectSerial,
  getFirmwareVersion,
  getUptime,
  getWifiStatus,
} from "./services/koreApi";
import { isSpotifyConnected } from "./services/spotifyApi";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Spotify from "./pages/Spotify";
import Google from "./pages/Google";

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
      console.error(error);
    }
  }

  async function connectToKore() {
    try {
      const result = await autoConnect();
      setConnected(result);

      if (result) {
        setFirmware(await getFirmwareVersion());
        setUptime(await getUptime());
        await loadWifiStatus();
        await loadSpotifyStatus();
      }
    } catch (error) {
      console.error(error);
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
      console.error(error);
    }
  }

  async function loadSpotifyStatus() {
    setSpotifyConnected(await isSpotifyConnected());
  }

  useEffect(() => {
      async function initialize() {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 50));
        await connectToKore();
      }
      initialize();
      startWatchers();
    }, []);


  useEffect(() => {
    if (!connected) {
      return;
    }

    const statusTimer = setInterval(async () => {
      await loadUptime();
      await loadWifiStatus();
      await loadSpotifyStatus();
    }, 5000);

    return () => {
      clearInterval(statusTimer);
    };
  }, [connected]);

  function renderPage() {
    switch (page) {
      case "spotify":
        return <Spotify />;

      case "google":
        return <Google />;

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
      <Sidebar page={page} setPage={setPage} />
      <main className="content">{renderPage()}</main>
    </div>
  );
}

export default App;
