import { useEffect, useState } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { countries } from "../data/countries";
import { sendSerialCommand } from "../services/koreApi";
import { emit } from "@tauri-apps/api/event";

export default function Settings() {
  const [autoDetect, setAutoDetect] = useState(true);

  const [country, setCountry] = useState(null);
  const [city, setCity] = useState(null);

  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");

  useEffect(() => {
    const savedAutoDetect =
      localStorage.getItem(
        "weather_autodetect"
      ) !== "false";

    setAutoDetect(savedAutoDetect);

    const savedCountry =
      localStorage.getItem(
        "weather_country"
      );

    if (savedCountry) {
      const foundCountry =
        countries.find(
          (item) =>
            item.label === savedCountry
        );

      if (foundCountry) {
        setCountry(foundCountry);
      }
    }

    const savedCity =
      localStorage.getItem(
        "weather_city"
      );

    const savedLatitude =
      localStorage.getItem(
        "weather_latitude"
      );

    const savedLongitude =
      localStorage.getItem(
        "weather_longitude"
      );

    if (
      savedCity &&
      savedLatitude &&
      savedLongitude
    ) {
      setCity({
        label: savedCity,
        value: savedCity,
        latitude: savedLatitude,
        longitude: savedLongitude,
      });
    }
  }, []);

  async function loadCities(
    inputValue
  ) {
    if (!inputValue) {
      return [];
    }

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          inputValue
        )}&count=20&language=en&format=json`
      );

      const data =
        await response.json();

      let results =
        data.results || [];

      if (country) {
        results =
          results.filter(
            (item) =>
              item.country_code ===
              country.value
          );
      }

      return results.map(
        (item) => ({
          value: item.id,
          label: `${item.name}, ${item.country}`,
          latitude:
            item.latitude,
          longitude:
            item.longitude,
        })
      );
    } catch (error) {
      await emit("app-notification", {
        source: "settings",
        code: "LOCATION_SEARCH_ERROR",
        level: "error",
        title: "Erro nas Configurações",
        message: `Erro ao buscar cidades: ${error.message}`,
        duration: 5000,
        persistent: false,
        priority: "high"
      });

      return [];
    }
  }

  function saveLocation() {
    localStorage.setItem(
      "weather_autodetect",
      autoDetect
    );

    if (
      !autoDetect &&
      country &&
      city
    ) {
      localStorage.setItem(
        "weather_country",
        country.label
      );

      localStorage.setItem(
        "weather_city",
        city.label
      );

      localStorage.setItem(
        "weather_latitude",
        city.latitude
      );

      localStorage.setItem(
        "weather_longitude",
        city.longitude
      );
    }
  }

  async function saveWiFi() {
    try {
      await sendSerialCommand(
        `wifi_connect|${wifiSsid}|${wifiPassword}`
      );
    } catch (error) {
      await emit("app-notification", {
        source: "settings",
        code: "WIFI_CONFIG_ERROR",
        level: "error",
        title: "Erro no WiFi",
        message: `Erro ao configurar WiFi: ${error.message}`,
        duration: 5000,
        persistent: false,
        priority: "high"
      });
    }
  }

  return (
    <>
      <div className="spotify-header">
        <h1>Settings</h1>
      </div>

      <div className="card">
        <h2>Location</h2>

        <label>
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) =>
              setAutoDetect(
                e.target.checked
              )
            }
          />
          {" "}
          Autodetect location
        </label>

        <br />
        <br />

        <Select
          options={countries}
          value={country}
          onChange={(value) => {
            setCountry(value);
            setCity(null);
          }}
          isDisabled={autoDetect}
          placeholder="Select country..."
        />

        <br />

        <AsyncSelect
          cacheOptions
          defaultOptions={false}
          loadOptions={loadCities}
          value={city}
          onChange={setCity}
          isDisabled={
            autoDetect || !country
          }
          placeholder="Search city..."
        />

        <br />

        <button
          onClick={saveLocation}
        >
          Save Location
        </button>
      </div>

      <div className="card">
        <h2>WiFi Settings</h2>

        <input
          type="text"
          placeholder="SSID"
          value={wifiSsid}
          onChange={(e) =>
            setWifiSsid(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={wifiPassword}
          onChange={(e) =>
            setWifiPassword(
              e.target.value
            )
          }
        />

        <br />
        <br />

        <button
          onClick={saveWiFi}
        >
          Connect WiFi
        </button>
      </div>
    </>
  );
}