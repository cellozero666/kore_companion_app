import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { enqueueNotification } from "./notificationManager";
import { sanitizeNotificationText } from "./emojiParser";

let unlisten = null;

export async function startNotificationWatcher() {
  if (unlisten) {
    return;
  }
  await invoke("start_notification_watcher");
  unlisten = await listen("system-notification", (event) => {
    const { app, title, body } = event.payload;
    const sanitizedBody = sanitizeNotificationText(body);
    enqueueNotification(app, title, sanitizedBody);
  });
}
