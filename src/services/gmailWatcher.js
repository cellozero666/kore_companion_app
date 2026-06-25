import { enqueueNotification } from "./notificationManager";
import { emit } from "@tauri-apps/api/event";

let interval = null;
let lastEmailId = localStorage.getItem("last_email_id") || null;

export function startGmailWatcher() {
  if (interval) return;
  // Polling a cada 2 minutos (120000ms) para teste
  interval = setInterval(pollGmail, 120000);
}

async function pollGmail() {
  try {
    const token = localStorage.getItem("google_access_token");
    if (!token) {
      return;
    }

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      await emit("app-notification", {
        source: "gmail",
        code: "GMAIL_API_ERROR",
        level: "error",
        title: "Erro no Gmail",
        message: `Erro na API (${response.status}): ${errorText}`,
        duration: 5000,
        persistent: false,
        priority: "high"
      });
      return;
    }

    const data = await response.json();

    if (!data.messages || data.messages.length === 0) {
      return;
    }

    const message = data.messages[0];
    if (message.id === lastEmailId) {
      return;
    }

    // Busca detalhes do e-mail
    const detailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!detailResponse.ok) {
        await emit("app-notification", {
            source: "gmail",
            code: "GMAIL_DETAIL_ERROR",
            level: "error",
            title: "Erro no Gmail",
            message: "Erro ao buscar detalhes do e-mail",
            duration: 5000,
            persistent: false,
            priority: "high"
        });
        return;
    }

    const details = await detailResponse.json();
    const fromHeader = details.payload.headers.find(h => h.name === 'From')?.value || 'Desconhecido';
    const subjectHeader = details.payload.headers.find(h => h.name === 'Subject')?.value || 'Sem Assunto';
    
    // Limpa o nome do remetente (tira o e-mail entre < >)
    const sender = fromHeader.split('<')[0].trim();

    // Envia para o KORE
    enqueueNotification("email", sender, subjectHeader);

    // Atualiza o estado
    lastEmailId = message.id;
    localStorage.setItem("last_email_id", lastEmailId);

  } catch (error) {
    await emit("app-notification", {
        source: "gmail",
        code: "GMAIL_WATCHER_ERROR",
        level: "error",
        title: "Erro no Gmail",
        message: `Erro ao buscar Gmail: ${error.message}`,
        duration: 5000,
        persistent: false,
        priority: "high"
    });
  }
}
