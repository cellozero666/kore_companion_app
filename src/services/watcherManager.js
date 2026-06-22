import { startSpotifyWatcher } from "./spotifyWatcher";
import { startNotificationWatcher } from "./notificationWatcher";
import { startGmailWatcher } from "./gmailWatcher";
import { startCalendarWatcher } from "./calendarWatcher";

export function startWatchers() {
  startSpotifyWatcher();
  startNotificationWatcher();
  startGmailWatcher();
  startCalendarWatcher();
}
