import { getCurrentPlaying } from "./spotifyApi";
import { sendSerialCommand } from "./koreApi";
import { setCurrentState } from "./notificationManager";

let interval = null;
let spotifyPlaying = false;

export function startSpotifyWatcher() {
  if (interval) {
    return;
  }

  interval = setInterval(pollSpotify, 5000);
}

export function stopSpotifyWatcher() {
  if (interval) {
    clearInterval(interval);

    interval = null;
  }
}

async function pollSpotify() {
  try {
    const token = localStorage.getItem("spotify_access_token");

    if (!token) {
      return;
    }

    const data = await getCurrentPlaying();

    if (!data || !data.item || !data.is_playing) {
      if (spotifyPlaying) {
        spotifyPlaying = false;
        setCurrentState("spotify_stop");
        await sendSerialCommand("spotify_stop");
      }

      return;
    }

    spotifyPlaying = true;

    const command = [
      "spotify",
      sanitize(data.item.name),
      sanitize(data.item.artists.map((artist) => artist.name).join(", ")),
      sanitize(data.item.album.name),
      data.progress_ms,
      data.item.duration_ms,
      data.is_playing ? "1" : "0",
    ].join("|");

    setCurrentState(command);
    await sendSerialCommand(command);
  } catch (error) {
    console.error(error);
  }
}

function sanitize(text) {
  return String(text ?? "")
    .replaceAll("|", " ")
    .replaceAll("\n", " ");
}
