import { enqueueNotification } from "./notificationManager";

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
      console.log("Gmail Watcher: Token não encontrado");
      return;
    }

    console.log("Gmail Watcher: Buscando e-mails...");
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gmail Watcher: Erro na API (${response.status}):`, errorText);
      return;
    }

    const data = await response.json();
    console.log("Gmail Watcher: Resposta da API:", data);

    if (!data.messages || data.messages.length === 0) {
      console.log("Gmail Watcher: Nenhum e-mail não lido encontrado");
      return;
    }

    const message = data.messages[0];
    if (message.id === lastEmailId) {
      console.log("Gmail Watcher: E-mail já processado");
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
        console.error("Gmail Watcher: Erro ao buscar detalhes do e-mail");
        return;
    }

    const details = await detailResponse.json();
    const fromHeader = details.payload.headers.find(h => h.name === 'From')?.value || 'Desconhecido';
    const subjectHeader = details.payload.headers.find(h => h.name === 'Subject')?.value || 'Sem Assunto';
    
    // Limpa o nome do remetente (tira o e-mail entre < >)
    const sender = fromHeader.split('<')[0].trim();

    console.log("Gmail Watcher: E-mail encontrado:", sender, subjectHeader);

    // Envia para o KORE
    enqueueNotification("email", sender, subjectHeader);

    // Atualiza o estado
    lastEmailId = message.id;
    localStorage.setItem("last_email_id", lastEmailId);

  } catch (error) {
    console.error("Erro ao buscar Gmail:", error);
  }
}
