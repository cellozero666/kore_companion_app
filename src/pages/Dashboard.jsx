import { FaCat } from "react-icons/fa";
import { useState } from "react";
import { sendSerialCommand } from "../services/koreApi";

export default function Dashboard({
  connected,
  firmware,
  uptime,
  wifiConnected,
  wifiIp,
  wifiSsid,
  spotifyConnected,
  googleConnected,
  connectToKore,
  disconnectFromKore,
}) {
  const [serialCmd, setSerialCmd] = useState("");

  async function handleSendSerial() {
    if (serialCmd) {
      await sendSerialCommand(serialCmd);
      setSerialCmd("");
    }
  }

  function formatUptime(uptimeSeconds) {
    const seconds = parseInt(uptimeSeconds, 10);

    if (isNaN(seconds)) {
      return "--";
    }

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0 && minutes === 0) {
      return "< 1m";
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  return (
    <>
      <div className="dashboard-header">
        <h1>K.O.R.E.</h1>

        <FaCat
          className={
            connected
              ? "dashboard-icon connected"
              : "dashboard-icon disconnected"
          }
          onClick={connected ? disconnectFromKore : connectToKore}
        />
      </div>

      <div className="card">
        <h2>Device</h2>
        <p>Firmware: {firmware}</p>
        <p>Uptime: {formatUptime(uptime)}</p>
        <br />
        <p>Spotify: {spotifyConnected ? " Connected" : " Disconnected"}</p>
        <p>Google: {googleConnected ? " Connected" : " Disconnected"}</p>
        <br />
        <p>
          WiFi: {wifiConnected ? ` Connected (${wifiSsid})` : " Disconnected"}
        </p>
        <p>IP: {wifiIp}</p>
      </div>

      <div className="card">
        <h2>Serial Test</h2>
        <input 
            type="text" 
            placeholder="Command" 
            value={serialCmd}
            onChange={(e) => setSerialCmd(e.target.value)}
        />
        <button onClick={handleSendSerial}>Send</button>
      </div>
    </>
  );
}
