import {
  FaHome,
  FaSpotify,
  FaGoogle,
  FaCloudSun,
  FaCog,
} from "react-icons/fa";

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <nav>
        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          <FaHome className="sidebar-icon dashboard" />
          Dashboard
        </button>

        <button
          className={page === "spotify" ? "active" : ""}
          onClick={() => setPage("spotify")}
        >
        <FaSpotify className="sidebar-icon spotify" />
          Spotify
        </button>

        <button
          className={page === "google" ? "active" : ""}
          onClick={() => setPage("google")}
        >
          <FaGoogle className="sidebar-icon google" />
          Google
        </button>

        <button
          className={page === "weather" ? "active" : ""}
          onClick={() => setPage("weather")}
        >
          <FaCloudSun className="sidebar-icon weather" />
          Weather
        </button>

        <button
          className={page === "settings" ? "active" : ""}
          onClick={() => setPage("settings")}
        >
          <FaCog className="sidebar-icon settings" />
          Settings
        </button>

      </nav>
    </aside>
  );
}
