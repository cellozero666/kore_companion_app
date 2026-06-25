import { useEffect } from 'react';

export default function KoreNotification({ notifications, removeNotification }) {
  if (notifications.length === 0) return null;

  return (
    <div className="kore-notification-container">
      {notifications.map((n) => (
        <KoreNotificationItem key={n.id} notification={n} remove={removeNotification} />
      ))}
    </div>
  );
}

function KoreNotificationItem({ notification, remove }) {
  const { duration = 5000, persistent = false } = notification;

  useEffect(() => {
    if (persistent) return;

    // Auto-dismiss após tempo configurável ou 5000ms padrão
    const timer = setTimeout(() => remove(notification.id), duration);
    return () => clearTimeout(timer);
  }, [notification.id, remove, duration, persistent]);

  return (
    <div className={`kore-notification kore-notification-${notification.level}`}>
      <div className="kore-notification-header">
        <strong>{notification.title}</strong>
        <button onClick={() => remove(notification.id)}>×</button>
      </div>
      <p>{notification.message}</p>
    </div>
  );
}
