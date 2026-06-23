import { useEffect, useState } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { countries } from "../data/countries";
import { sendSerialCommand } from "../services/koreApi";

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

      console.log(
        "Open Meteo Results:",
        data.results
      );

      console.log(
        "Selected Country:",
        country
      );

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

      console.log(
        "Filtered Results:",
        results
      );

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
      console.error(error);

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

    alert(
      "Location saved"
    );
  }

  async function saveWiFi() {
    try {
      await sendSerialCommand(
        `wifi_connect|${wifiSsid}|${wifiPassword}`
      );

      alert(
        "WiFi configuration sent"
      );
    } catch (error) {
      console.error(error);
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