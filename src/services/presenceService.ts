import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPresenceStatus } from '../lib/types';

export const updatePresence = async (uid: string, status: UserPresenceStatus, isOnline: boolean) => {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      presenceStatus: status,
      isOnline: isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    // Silently fail if it's a permission error during logout/unload
  }
};

export const initPresence = (uid: string) => {
  let inactivityTimeout: any;
  let heartbeatInterval: any;

  const resetInactivityTimeout = () => {
    clearTimeout(inactivityTimeout);
    updatePresence(uid, 'online', true);
    inactivityTimeout = setTimeout(() => {
      updatePresence(uid, 'away', true);
    }, 5 * 60 * 1000); // 5 minutes
  };

  const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      updatePresence(uid, 'online', true);
    }, 60 * 1000); // Every minute
  };

  window.addEventListener('mousemove', resetInactivityTimeout);
  window.addEventListener('keydown', resetInactivityTimeout);
  window.addEventListener('click', resetInactivityTimeout);

  // Initial status
  updatePresence(uid, 'online', true);
  resetInactivityTimeout();
  startHeartbeat();

  const handleUnload = () => {
    const userRef = doc(db, 'users', uid);
    updateDoc(userRef, {
      isOnline: false,
      presenceStatus: 'offline',
      lastSeen: serverTimestamp()
    });
  };

  window.addEventListener('beforeunload', handleUnload);

  return () => {
    clearInterval(heartbeatInterval);
    clearTimeout(inactivityTimeout);
    window.removeEventListener('mousemove', resetInactivityTimeout);
    window.removeEventListener('keydown', resetInactivityTimeout);
    window.removeEventListener('click', resetInactivityTimeout);
    window.removeEventListener('beforeunload', handleUnload);
    handleUnload();
  };
};
