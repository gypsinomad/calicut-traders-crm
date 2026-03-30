import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './Auth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: any;
  read: boolean;
  userId: string;
}

export default function NotificationCenter() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(newNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      // If it's a permission error, it might be due to rules propagation or role sync
      if (error.message.includes('permission') && retry < 3) {
        console.warn(`Retrying notification fetch (attempt ${retry + 1})...`);
        setTimeout(() => setRetry(prev => prev + 1), 2000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, retry]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error removing notification:", error);
    }
  };

  const getTimestamp = (timestamp: any) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) {
      try {
        return timestamp.toDate();
      } catch (e) {
        return new Date();
      }
    }
    return new Date(timestamp);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-zinc-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded-md transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-zinc-400 text-xs">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-zinc-400 text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`p-4 hover:bg-zinc-50 transition-all duration-300 relative group ${!notification.read ? 'bg-zinc-50/50' : ''}`}
                      >
                        {!notification.read && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            notification.type === 'warning' ? 'bg-amber-500' :
                            notification.type === 'success' ? 'bg-emerald-500' :
                            notification.type === 'error' ? 'bg-rose-500' :
                            'bg-blue-500'
                          }`} />
                        )}
                        <div className="flex gap-3">
                          <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                            notification.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                            notification.type === 'error' ? 'bg-rose-50 text-rose-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {notification.type === 'success' ? <Check size={14} /> :
                             notification.type === 'warning' ? <AlertTriangle size={14} /> :
                             notification.type === 'error' ? <X size={14} /> :
                             <Info size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-bold truncate ${notification.read ? 'text-zinc-600' : 'text-zinc-900'}`}>
                                {notification.title}
                              </p>
                              <button 
                                onClick={() => removeNotification(notification.id)}
                                className="text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-2">
                              {formatDistanceToNow(getTimestamp(notification.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {!notification.read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="absolute inset-0 w-full h-full opacity-0"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-top border-zinc-100 text-center bg-zinc-50/50">
                <button className="text-xs font-bold text-zinc-900 hover:underline">
                  View all activity
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
