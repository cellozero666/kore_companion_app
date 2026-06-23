import { useEffect, useState, useRef } from "react";
import { sendSerialCommand } from "../services/koreApi";

export default function Weather() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const lastWeatherPayload = useRef("");

  function getWeatherText(code) {
    if (code === 0) {
      return "Sunny";
    }

    if (code <= 3) {
      return "Partly Cloudy";
    }

    if (code <= 48) {
      return "Cloudy";
    }

    if (code <= 67) {
      return "Rain";
    }

    if (code <= 77) {
      return "Snow";
    }

    return "Storm";
  }

  function getIcon(code) {
    if (code === 0) {
      return "☀️";
    }

    if (code <= 3) {
      return "🌤️";
    }

    if (code <= 48) {
      return "☁️";
    }

    if (code <= 67) {
      return "🌧️";
    }

    if (code <= 77) {
      return "❄️";
    }

    return "⛈️";
  }

  // ESP32 weather_icons.h
  // 0 = ICON_CLOUD
  // 1 = ICON_PARTLYCLOUD
  // 2 = ICON_RAIN
  // 3 = ICON_SNOW
  // 4 = ICON_STORM
  // 5 = ICON_SUN
  function getWeatherIconIndex(code) {
    if (code === 0) {
      return 5;
    }

    if (code <= 3) {
      return 1;
    }

    if (code <= 48) {
      return 0;
    }

    if (code <= 67) {
      return 2;
    }

    if (code <= 77) {
      return 3;
    }

    return 4;
  }

  async function loadWeather() {
    try {
      const autoDetect =
        localStorage.getItem("weather_autodetect") !== "false";

      let cityName = "Unknown";
      let latitude;
      let longitude;

      if (!autoDetect) {
        cityName =
          localStorage.getItem("weather_city") ||
          "Unknown";

        latitude =
          localStorage.getItem("weather_latitude");

        longitude =
          localStorage.getItem("weather_longitude");

        if (!latitude || !longitude) {
          throw new Error("No saved coordinates");
        }
      } else {
        const locationResponse =
          await fetch("https://ipinfo.io/json");

        const locationData =
          await locationResponse.json();

        cityName =
          locationData.city || "Unknown";

        const coords =
          locationData.loc?.split(",");

        if (!coords) {
          throw new Error(
            "No coordinates returned"
          );
        }

        latitude = coords[0];
        longitude = coords[1];
      }

      setCity(cityName);

      const weatherResponse =
        await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        );

      const weatherData =
        await weatherResponse.json();

      const temp =
        Math.round(
          weatherData.current.temperature_2m
        );

      const max =
        Math.round(
          weatherData.daily.temperature_2m_max[0]
        );

      const min =
        Math.round(
          weatherData.daily.temperature_2m_min[0]
        );

      const code =
        weatherData.current.weather_code;

      setWeather({
        temp,
        max,
        min,
        code,
      });

      const iconIndex =
        getWeatherIconIndex(code);

      const payload = [
        "weather",
        cityName,
        temp,
        max,
        min,
        iconIndex
      ].join("|");

      if (
        payload !==
        lastWeatherPayload.current
      ) {
        await sendSerialCommand(
          payload
        );

        lastWeatherPayload.current =
          payload;
      }

      setLastUpdate(
        new Date().toLocaleTimeString()
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeather();

    const timer =
      setInterval(
        loadWeather,
        1000 * 60 * 20
      );

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <h1>Weather</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="card">
        <h1>Weather</h1>
        <p>Weather unavailable</p>
      </div>
    );
  }

  return (
    <>
      <div className="spotify-header">
        <h1>Weather</h1>
      </div>

      <div className="card spotify-player">
        <div className="weather-container">
          <h2 className="weather-city">
            {city}
          </h2>

          <h1 className="weather-temperature">
            {weather.temp}°
          </h1>

          <p className="weather-condition">
            {getIcon(weather.code)}{" "}
            {getWeatherText(weather.code)}
          </p>

          <p className="weather-minmax">
            Max {weather.max}°{" • "}
            Min {weather.min}°
          </p>

          <p className="weather-update">
            Updated at {lastUpdate}
          </p>
        </div>
      </div>
    </>
  );
}