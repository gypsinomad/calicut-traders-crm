import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, Trash2, CheckCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './Auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: any;
  read: boolean;
  userId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export default function NotificationCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

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
      where('organization', '==', profile.organization),
      orderBy('timestamp', 'desc'),
      limit(50)
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
      if (error.message.includes('permission') && retry < 3) {
        setTimeout(() => setRetry(prev => prev + 1), 2000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, retry]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }

    if (notification.relatedEntityType === 'user') {
      navigate('/users');
      setIsOpen(false);
    } else if (notification.relatedEntityType === 'order') {
      navigate('/orders');
      setIsOpen(false);
    } else if (notification.relatedEntityType === 'lead') {
      navigate('/leads');
      setIsOpen(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    setMarkingAll(true);
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm('Are you sure you want to delete all notifications?')) return;

    setClearingAll(true);
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      toast.success('All notifications cleared');
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error('Failed to clear notifications');
    } finally {
      setClearingAll(false);
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
              className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearAll}
                        disabled={clearingAll}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Clear all"
                      >
                        {clearingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeTab === 'all' 
                          ? 'bg-white text-zinc-900 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActiveTab('unread')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeTab === 'unread' 
                          ? 'bg-white text-zinc-900 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-700'
                      }`}
                    >
                      Unread
                    </button>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      disabled={markingAll}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-colors disabled:opacity-50"
                    >
                      {markingAll ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCheck size={14} />
                      )}
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 size={24} className="text-emerald-600 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-400 text-xs font-medium">Fetching updates...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bell size={24} className="text-zinc-300" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900">All caught up!</h4>
                    <p className="text-zinc-400 text-xs mt-1">
                      {activeTab === 'unread' ? "No unread notifications" : "No notifications yet"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    <AnimatePresence initial={false}>
                      {filteredNotifications.map(notification => (
                        <motion.div 
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 hover:bg-zinc-50 transition-all relative group cursor-pointer ${!notification.read ? 'bg-emerald-50/30' : ''}`}
                        >
                          {!notification.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                          )}
                          <div className="flex gap-3">
                            <div className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${
                              notification.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              notification.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              notification.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {notification.type === 'success' ? <Check size={16} /> :
                               notification.type === 'warning' ? <AlertTriangle size={16} /> :
                               notification.type === 'error' ? <X size={16} /> :
                               <Info size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-bold truncate ${notification.read ? 'text-zinc-600' : 'text-zinc-900'}`}>
                                  {notification.title}
                                </p>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-[10px] font-medium text-zinc-400">
                                  {formatDistanceToNow(getTimestamp(notification.timestamp), { addSuffix: true })}
                                </p>
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-zinc-100 text-center bg-zinc-50/50">
                <button 
                  onClick={() => {
                    navigate('/communications');
                    setIsOpen(false);
                  }}
                  className="text-xs font-bold text-zinc-900 hover:text-emerald-600 transition-colors"
                >
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
