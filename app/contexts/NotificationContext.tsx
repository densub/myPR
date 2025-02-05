import { createContext, useContext, useState, useEffect } from 'react';
import { onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Notification } from '../types/database';

type NotificationContextType = {
  unreadCount: number;
  notifications: Notification[];
  refreshNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  refreshNotifications: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      where('fromUserId', '!=', auth.currentUser.uid),
      orderBy('fromUserId'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Notification snapshot received:', snapshot.docs.length);
      const notificationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      const filteredNotifications = notificationData.filter(
        n => n.fromUserId !== auth.currentUser?.uid
      );
      
      console.log('Processed notifications:', filteredNotifications);
      setNotifications(filteredNotifications);
      setUnreadCount(filteredNotifications.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, []);

  const refreshNotifications = () => {
    if (auth.currentUser) {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', auth.currentUser.uid),
        where('fromUserId', '!=', auth.currentUser.uid),
        orderBy('fromUserId'),
        orderBy('timestamp', 'desc')
      );
      onSnapshot(q, () => {});
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext); 