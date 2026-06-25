import { enqueueNotification } from "./notificationManager";
import { emit } from "@tauri-apps/api/event";

let interval = null;
let lastEventId = localStorage.getItem("last_event_id") || null;

export function startCalendarWatcher() {
  if (interval) return;
  // Polling a cada 5 minutos (300000ms)
  interval = setInterval(pollCalendar, 300000);
}

async function pollCalendar() {
  try {
    const token = localStorage.getItem("google_access_token");
    if (!token) return;

    // Busca eventos próximos (próximas 24 horas)
    const now = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();
    if (!data.items || data.items.length === 0) return;

    const event = data.items[0];
    if (event.id === lastEventId) return;

    // Formata o horário do evento
    const startTime = new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Envia para o KORE
    // notification|App|Title|Body
    enqueueNotification("calendar", event.summary, `${startTime}`);

    // Atualiza o estado
    lastEventId = event.id;
    localStorage.setItem("last_event_id", lastEventId);

  } catch (error) {
    await emit("app-notification", {
        source: "calendar",
        code: "CALENDAR_WATCHER_ERROR",
        level: "error",
        title: "Erro no Calendário",
        message: `Erro ao buscar Calendário: ${error.message}`,
        duration: 5000,
        persistent: false,
        priority: "high"
    });
  }
}
