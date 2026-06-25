import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import KoreNotification from './KoreNotification';

let nextNotificationId = 0;

export function NotificationManager() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unlisten = listen('app-notification', (event) => {
      const { code } = event.payload;
      
      // Filtro de duplicatas por 'code'
      setNotifications((prev) => {
        if (prev.some((n) => n.code === code)) {
          return prev;
        }
        
        const newNotif = { 
          id: ++nextNotificationId,
          ...event.payload 
        };
        
        return [...prev, newNotif];
      });
    });
    return () => unlisten.then((f) => f());
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <KoreNotification 
      notifications={notifications} 
      removeNotification={removeNotification} 
    />
  );
}
