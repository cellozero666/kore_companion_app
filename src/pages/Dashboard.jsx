import { FaCat } from "react-icons/fa";

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
    </>
  );
}
