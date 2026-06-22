import { sendSerialCommand } from "./koreApi";

const notificationQueue = [];

let notificationActive = false;

let currentState = null;

export function setCurrentState(command) {
  currentState = command;
}

export function enqueueNotification(
  app,
  title,
  body
) {
  notificationQueue.push({
    app,
    title,
    body,
  });

  processQueue();
}

async function processQueue() {
  if (notificationActive) {
    return;
  }

  const notification =
    notificationQueue.shift();

  if (!notification) {
    await restoreCurrentState();

    return;
  }

  notificationActive = true;

  const command = [
    "notification",
    sanitize(notification.app),
    sanitize(notification.title),
    sanitize(notification.body),
  ].join("|");

  await sendSerialCommand(command);

  setTimeout(async () => {
    notificationActive = false;

    processQueue();
  }, 5000);
}

async function restoreCurrentState() {
  if (!currentState) {
    return;
  }

  await sendSerialCommand(currentState);
}

function sanitize(text) {
  return String(text ?? "")
    .replaceAll("|", " ")
    .replaceAll("\n", " ");
}